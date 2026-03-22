import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { DELIVERY_RELIABLE, EVENT_RAW, MistNode } from '../mistlib/wrappers/web/index.js';
import type { Site } from '../utils/site';
import type { Settings } from './useSettings';

type SyncStatus = 'idle' | 'connecting' | 'connected' | 'error';

type SyncSnapshot = {
  version: 1;
  roomId: string;
  updatedAt: number;
  settings: Settings;
  sites: Site[];
};

type SyncMessage =
  | {
      type: 'request-snapshot';
      roomId: string;
      from: string;
    }
  | {
      type: 'accept-settings';
      roomId: string;
      from: string;
    }
  | {
      type: 'snapshot';
      roomId: string;
      from: string;
      snapshot: SyncSnapshot;
    };

const ROOM_QUERY_KEY = 'room';
const ROOM_PREFIX = '^%70Xk*8^%c5V';
const DEVICE_STORAGE_KEY = 'tc-home-device-id';
const BROADCAST_GRACE_MS = 900;
const PRESENCE_EVENT_TYPES = new Set([2, 3, 4]);

function readDeviceId() {
  const stored = localStorage.getItem(DEVICE_STORAGE_KEY);
  if (stored) return stored;

  const next = crypto.randomUUID();
  localStorage.setItem(DEVICE_STORAGE_KEY, next);
  return next;
}

function readInitialRoomId() {
  const queryRoom = new URLSearchParams(window.location.search).get(ROOM_QUERY_KEY)?.trim();
  return queryRoom ?? '';
}

function buildInviteUrl(roomId: string) {
  const url = new URL(window.location.href);
  url.searchParams.set(ROOM_QUERY_KEY, roomId);
  url.hash = '';
  return url.toString();
}

function buildTransportRoomId(roomId: string) {
  return `${ROOM_PREFIX}${roomId}`;
}

function serializeSnapshot(settings: Settings, sites: Site[]) {
  return JSON.stringify({
    version: 1,
    settings,
    sites,
  });
}

function settingsSignature(settings: Settings) {
  return JSON.stringify(settings);
}

function readPeerCount(node: MistNode, selfId: string) {
  const allNodes = node.getAllNodes();
  if (!Array.isArray(allNodes) || allNodes.length === 0) return 0;

  const isSelfNode = (value: unknown) => {
    if (!value || typeof value !== 'object') return false;

    const candidate = value as {
      id?: unknown;
      nodeId?: unknown;
      deviceId?: unknown;
      fromId?: unknown;
    };

    return [candidate.id, candidate.nodeId, candidate.deviceId, candidate.fromId].some(
      (entry) => entry === selfId,
    );
  };

  const peers = allNodes.filter((entry) => !isSelfNode(entry));

  if (peers.length > 0) {
    return peers.length;
  }

  return Math.max(0, allNodes.length - 1);
}

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.readOnly = true;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error('clipboard copy failed');
  }
}

export function useManualSync({
  settings,
  sites,
  replaceSettings,
  replaceSites,
}: {
  settings: Settings;
  sites: Site[];
  replaceSettings: (next: Settings) => void;
  replaceSites: (next: Site[]) => void;
}) {
  const deviceId = useMemo(() => readDeviceId(), []);
  const initialRoomId = useMemo(() => readInitialRoomId(), []);
  const [roomId, setRoomId] = useState(initialRoomId);
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [error, setError] = useState('');
  const [acceptRemoteSettingsValue, setAcceptRemoteSettingsValue] = useState(true);
  const [peerCount, setPeerCount] = useState(0);
  const [hasRemoteSettingsDiff, setHasRemoteSettingsDiff] = useState(false);

  const nodeRef = useRef<MistNode | null>(null);
  const settingsRef = useRef(settings);
  const sitesRef = useRef(sites);
  const latestAppliedStampRef = useRef(0);
  const lastSentSignatureRef = useRef('');
  const readyToBroadcastRef = useRef(false);
  const broadcastTimerRef = useRef<number | null>(null);
  const queuedSnapshotRef = useRef<SyncSnapshot | null>(null);
  const lastRemoteSettingsRef = useRef<Settings | null>(null);
  const activeRoomIdRef = useRef('');
  const connectingRoomIdRef = useRef('');
  const connectSessionRef = useRef(0);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    sitesRef.current = sites;
  }, [sites]);

  useEffect(() => {
    const remoteSettings = lastRemoteSettingsRef.current;
    if (!remoteSettings || acceptRemoteSettingsValue) {
      setHasRemoteSettingsDiff(false);
      return;
    }

    setHasRemoteSettingsDiff(settingsSignature(settings) !== settingsSignature(remoteSettings));
  }, [acceptRemoteSettingsValue, settings]);

  useEffect(() => {
    const nextUrl = new URL(window.location.href);

    if (!roomId) {
      if (nextUrl.searchParams.has(ROOM_QUERY_KEY)) {
        nextUrl.searchParams.delete(ROOM_QUERY_KEY);
        window.history.replaceState({}, '', nextUrl.toString());
      }
      activeRoomIdRef.current = '';
      connectingRoomIdRef.current = '';
      return;
    }

    if (nextUrl.searchParams.get(ROOM_QUERY_KEY) !== roomId) {
      nextUrl.searchParams.set(ROOM_QUERY_KEY, roomId);
      window.history.replaceState({}, '', nextUrl.toString());
    }
  }, [roomId]);

  const clearBroadcastTimer = useCallback(() => {
    if (broadcastTimerRef.current !== null) {
      window.clearTimeout(broadcastTimerRef.current);
      broadcastTimerRef.current = null;
    }
  }, []);

  const safeLeaveRoom = useCallback((node: MistNode | null) => {
    const runtimeNode = node as MistNode & { initialized?: boolean } | null;
    if (!runtimeNode || !runtimeNode.initialized) return;

    try {
      runtimeNode.leaveRoom();
    } catch {
      // Ignore cleanup errors from partially initialized WASM state.
    }
  }, []);

  const makeSnapshot = useCallback((updatedAt = Date.now()): SyncSnapshot => {
    const snapshotSettings = settingsRef.current;
    const snapshotSites = sitesRef.current;

    return {
      version: 1,
      roomId,
      updatedAt,
      settings: snapshotSettings,
      sites: snapshotSites,
    };
  }, [roomId]);

  const sendMessage = useCallback((message: SyncMessage) => {
    const node = nodeRef.current;
    if (!node) return;

    const payload = new TextEncoder().encode(JSON.stringify(message));
    node.sendMessage('', payload, DELIVERY_RELIABLE);
  }, []);

  const refreshPeerCount = useCallback((node: MistNode) => {
    setPeerCount(readPeerCount(node, deviceId));
  }, [deviceId]);

  const stopCurrentConnection = useCallback(() => {
    clearBroadcastTimer();
    readyToBroadcastRef.current = false;
    queuedSnapshotRef.current = null;
    lastRemoteSettingsRef.current = null;
    setHasRemoteSettingsDiff(false);
    activeRoomIdRef.current = '';
    connectingRoomIdRef.current = '';
    setPeerCount(0);

    const currentNode = nodeRef.current;
    if (currentNode) {
      safeLeaveRoom(currentNode);
      nodeRef.current = null;
    }
  }, [clearBroadcastTimer, safeLeaveRoom]);

  const sendCurrentSnapshot = useCallback(() => {
    if (!roomId) return;

    const updatedAt = Date.now();
    latestAppliedStampRef.current = updatedAt;
    const snapshot = makeSnapshot(updatedAt);
    const signature = serializeSnapshot(snapshot.settings, snapshot.sites);

    lastSentSignatureRef.current = signature;
    queuedSnapshotRef.current = null;
    sendMessage({
      type: 'snapshot',
      roomId,
      from: deviceId,
      snapshot,
    });
  }, [deviceId, makeSnapshot, roomId, sendMessage]);

  const flushQueuedSnapshot = useCallback(() => {
    if (!readyToBroadcastRef.current || !queuedSnapshotRef.current) return;

    const snapshot = queuedSnapshotRef.current;
    const signature = serializeSnapshot(snapshot.settings, snapshot.sites);
    if (signature === lastSentSignatureRef.current) {
      queuedSnapshotRef.current = null;
      return;
    }

    latestAppliedStampRef.current = snapshot.updatedAt;
    lastSentSignatureRef.current = signature;
    queuedSnapshotRef.current = null;
    sendMessage({
      type: 'snapshot',
      roomId: snapshot.roomId,
      from: deviceId,
      snapshot,
    });
  }, [deviceId, sendMessage]);

  const setAcceptRemoteSettings = useCallback((next: boolean) => {
    setAcceptRemoteSettingsValue((current) => {
      if (next && !current && roomId && status === 'connected') {
        sendMessage({
          type: 'accept-settings',
          roomId,
          from: deviceId,
        });
      }

      return next;
    });
  }, [deviceId, roomId, sendMessage, status]);

  const handleIncomingMessage = useCallback(
    (fromId: string, payload: Uint8Array) => {
      let parsed: SyncMessage | null = null;
      try {
        const text = new TextDecoder().decode(payload);
        parsed = JSON.parse(text) as SyncMessage;
      } catch {
        return;
      }

      if (!parsed || parsed.roomId !== roomId) return;
      if (parsed.from === deviceId) return;

      if (parsed.type === 'request-snapshot') {
        if (!readyToBroadcastRef.current) {
          queuedSnapshotRef.current = makeSnapshot();
          return;
        }
        sendCurrentSnapshot();
        return;
      }

      if (parsed.type === 'accept-settings') {
        sendCurrentSnapshot();
        return;
      }

      if (parsed.type !== 'snapshot') return;
      if (parsed.snapshot.version !== 1) return;

      const signature = serializeSnapshot(parsed.snapshot.settings, parsed.snapshot.sites);
      if (parsed.snapshot.updatedAt < latestAppliedStampRef.current) return;

      lastRemoteSettingsRef.current = parsed.snapshot.settings;
      const nextSettingsDiff =
        settingsSignature(settingsRef.current) !== settingsSignature(parsed.snapshot.settings);

      latestAppliedStampRef.current = parsed.snapshot.updatedAt;
      lastSentSignatureRef.current = signature;
      queuedSnapshotRef.current = null;
      readyToBroadcastRef.current = true;
      setStatus('connected');
      if (acceptRemoteSettingsValue) {
        replaceSettings(parsed.snapshot.settings);
        setHasRemoteSettingsDiff(false);
      } else {
        setHasRemoteSettingsDiff(nextSettingsDiff);
      }
      replaceSites(parsed.snapshot.sites);
    },
    [acceptRemoteSettingsValue, deviceId, readyToBroadcastRef, replaceSettings, replaceSites, roomId, sendCurrentSnapshot],
  );

    const connectToRoom = useCallback(async (targetRoomId: string) => {
      const normalizedRoomId = targetRoomId.trim();
      if (!normalizedRoomId) return;
      if (activeRoomIdRef.current === normalizedRoomId) return;
      if (connectingRoomIdRef.current === normalizedRoomId && nodeRef.current) return;

      connectSessionRef.current += 1;
      const sessionId = connectSessionRef.current;

      stopCurrentConnection();
      readyToBroadcastRef.current = false;
      setStatus('connecting');
      setError('');

      const node = new MistNode(deviceId);
      nodeRef.current = node;
      connectingRoomIdRef.current = normalizedRoomId;

      try {
        await node.init();
        if (sessionId !== connectSessionRef.current) {
          safeLeaveRoom(node);
          return;
        }

        node.onEvent((eventType, fromId, payload) => {
          if (eventType === EVENT_RAW) {
            handleIncomingMessage(fromId, payload as Uint8Array);
            return;
          }

          if (PRESENCE_EVENT_TYPES.has(eventType)) {
            refreshPeerCount(node);
          }
        });

        node.joinRoom(buildTransportRoomId(normalizedRoomId));
        activeRoomIdRef.current = normalizedRoomId;
        setStatus('connected');
        refreshPeerCount(node);
        sendMessage({
          type: 'request-snapshot',
          roomId: normalizedRoomId,
          from: deviceId,
        });

        clearBroadcastTimer();
        broadcastTimerRef.current = window.setTimeout(() => {
          if (sessionId !== connectSessionRef.current) return;
          readyToBroadcastRef.current = true;
          flushQueuedSnapshot();
        }, BROADCAST_GRACE_MS);
      } catch (caughtError) {
        if (sessionId !== connectSessionRef.current) return;
        setStatus('error');
        setError(caughtError instanceof Error ? caughtError.message : '同期に失敗しました。');
        stopCurrentConnection();
        return;
      } finally {
        if (sessionId === connectSessionRef.current) {
          connectingRoomIdRef.current = '';
        }
      }
    }, [clearBroadcastTimer, deviceId, flushQueuedSnapshot, handleIncomingMessage, refreshPeerCount, safeLeaveRoom, sendMessage, stopCurrentConnection]);

  useEffect(() => {
    if (!initialRoomId) return;
    void connectToRoom(initialRoomId);
  }, [connectToRoom, initialRoomId]);

  useEffect(() => {
    return () => {
      connectSessionRef.current += 1;
      stopCurrentConnection();
      latestAppliedStampRef.current = 0;
      lastSentSignatureRef.current = '';
      setStatus('idle');
      setError('');
    };
  }, [stopCurrentConnection]);

  useEffect(() => {
    if (!roomId) return;
    if (status !== 'connected') return;

    const signature = serializeSnapshot(settings, sites);
    if (signature === lastSentSignatureRef.current) return;

    const updatedAt = Date.now();
    latestAppliedStampRef.current = updatedAt;
    const snapshot = makeSnapshot(updatedAt);
    const nextSignature = serializeSnapshot(snapshot.settings, snapshot.sites);

    if (!readyToBroadcastRef.current) {
      queuedSnapshotRef.current = snapshot;
      return;
    }

    queuedSnapshotRef.current = null;
    lastSentSignatureRef.current = nextSignature;
    sendMessage({
      type: 'snapshot',
      roomId,
      from: deviceId,
      snapshot,
    });
  }, [deviceId, makeSnapshot, roomId, sendMessage, settings, sites, status]);

  const createRoom = useCallback(() => {
    const nextRoomId = crypto.randomUUID();
    setRoomId(nextRoomId);
    return nextRoomId;
  }, []);

  const startSync = useCallback(() => {
    const nextRoomId = roomId || createRoom();
    void connectToRoom(nextRoomId);
    return nextRoomId;
  }, [connectToRoom, createRoom, roomId]);

  const copyInviteLink = useCallback(async () => {
    const nextRoomId = roomId || createRoom();
    const inviteUrl = buildInviteUrl(nextRoomId);

    try {
      await copyToClipboard(inviteUrl);
      return inviteUrl;
    } catch {
      setError('クリップボードにコピーできませんでした。');
      return inviteUrl;
    }
  }, [createRoom, roomId]);

  const inviteUrl = useMemo(() => (roomId ? buildInviteUrl(roomId) : ''), [roomId]);

  const disconnect = useCallback(() => {
    connectSessionRef.current += 1;
    stopCurrentConnection();
    queuedSnapshotRef.current = null;
    lastSentSignatureRef.current = '';
    latestAppliedStampRef.current = 0;
    setStatus('idle');
    setError('');
  }, [stopCurrentConnection]);

  return {
    roomId,
    inviteUrl,
    status,
    error,
    acceptRemoteSettings: acceptRemoteSettingsValue,
    setAcceptRemoteSettings,
    peerCount,
    hasRemoteSettingsDiff,
    createRoom,
    startSync,
    copyInviteLink,
    disconnect,
  };
}
