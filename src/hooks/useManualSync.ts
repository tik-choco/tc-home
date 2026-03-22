import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { DELIVERY_RELIABLE, MistNode } from '../mistlib/wrappers/web/index.js';
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
      type: 'snapshot';
      roomId: string;
      from: string;
      snapshot: SyncSnapshot;
    };

const ROOM_QUERY_KEY = 'room';
const DEVICE_STORAGE_KEY = 'tc-home-device-id';
const BROADCAST_GRACE_MS = 900;

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

function serializeSnapshot(settings: Settings, sites: Site[]) {
  return JSON.stringify({
    version: 1,
    settings,
    sites,
  });
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
  const [syncRequested, setSyncRequested] = useState(Boolean(initialRoomId));
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [notice, setNotice] = useState(initialRoomId ? '同期ルームに接続しています。' : '同期リンクを作成できます。');
  const [error, setError] = useState('');

  const nodeRef = useRef<MistNode | null>(null);
  const settingsRef = useRef(settings);
  const sitesRef = useRef(sites);
  const latestAppliedStampRef = useRef(0);
  const lastSentSignatureRef = useRef('');
  const readyToBroadcastRef = useRef(false);
  const broadcastTimerRef = useRef<number | null>(null);
  const queuedSnapshotRef = useRef<SyncSnapshot | null>(null);
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

      if (parsed.type !== 'snapshot') return;
      if (parsed.snapshot.version !== 1) return;

      const signature = serializeSnapshot(parsed.snapshot.settings, parsed.snapshot.sites);
      if (parsed.snapshot.updatedAt < latestAppliedStampRef.current) return;

      latestAppliedStampRef.current = parsed.snapshot.updatedAt;
      lastSentSignatureRef.current = signature;
      queuedSnapshotRef.current = null;
      readyToBroadcastRef.current = true;
      setStatus('connected');
      setNotice('同期データを受信しました。');
      replaceSettings(parsed.snapshot.settings);
      replaceSites(parsed.snapshot.sites);
    },
    [deviceId, readyToBroadcastRef, replaceSettings, replaceSites, roomId, sendCurrentSnapshot],
  );

  useEffect(() => {
    if (!roomId || !syncRequested) {
      clearBroadcastTimer();
      readyToBroadcastRef.current = false;
      setStatus('idle');
      setError('');
      setNotice(roomId ? '同期を開始できます。' : '同期リンクを作成できます。');
      const node = nodeRef.current;
      if (node) {
        node.leaveRoom();
        nodeRef.current = null;
      }
      activeRoomIdRef.current = '';
      connectingRoomIdRef.current = '';
      return;
    }

    if (activeRoomIdRef.current === roomId) {
      return;
    }

    const currentNode = nodeRef.current as (MistNode & { initialized?: boolean }) | null;
    if (connectingRoomIdRef.current === roomId && currentNode && !currentNode.initialized) {
      return;
    }

    let active = true;
    const node = new MistNode(deviceId);
    nodeRef.current = node;
    connectingRoomIdRef.current = roomId;
    const sessionId = ++connectSessionRef.current;
    readyToBroadcastRef.current = false;
    setStatus('connecting');
    setError('');
    setNotice('同期ルームに接続しています。');

    (async () => {
      try {
        await node.init();
        if (!active || sessionId !== connectSessionRef.current) {
          safeLeaveRoom(node);
          return;
        }

        node.onRawMessage((fromId, payload) => {
          handleIncomingMessage(fromId, payload);
        });

        node.joinRoom(roomId);
  activeRoomIdRef.current = roomId;
        setStatus('connected');
        setNotice('同期ルームに接続しました。');
        sendMessage({
          type: 'request-snapshot',
          roomId,
          from: deviceId,
        });

        clearBroadcastTimer();
        broadcastTimerRef.current = window.setTimeout(() => {
          if (!active) return;
          readyToBroadcastRef.current = true;
          flushQueuedSnapshot();
        }, BROADCAST_GRACE_MS);
      } catch (caughtError) {
        if (!active || sessionId !== connectSessionRef.current) return;
        setStatus('error');
        setError(caughtError instanceof Error ? caughtError.message : '同期に失敗しました。');
        setNotice('同期ルームへの接続に失敗しました。');
      }
    })();

    return () => {
      active = false;
      clearBroadcastTimer();
      readyToBroadcastRef.current = false;
      connectingRoomIdRef.current = '';
      const currentNode = nodeRef.current;
      if (currentNode) {
        safeLeaveRoom(currentNode);
        nodeRef.current = null;
      }
    };
  }, [clearBroadcastTimer, deviceId, flushQueuedSnapshot, handleIncomingMessage, roomId, safeLeaveRoom, sendMessage]);

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
    setNotice('同期リンクを作成しました。');
    return nextRoomId;
  }, []);

  const startSync = useCallback(() => {
    if (!roomId) {
      const nextRoomId = createRoom();
      setSyncRequested(true);
      setNotice('同期ルームに接続しています。');
      return nextRoomId;
    }

    setSyncRequested(true);
    setNotice('同期ルームに接続しています。');
    return roomId;
  }, [createRoom, roomId]);

  const copyInviteLink = useCallback(async () => {
    const nextRoomId = roomId || createRoom();
    const inviteUrl = buildInviteUrl(nextRoomId);

    try {
      await copyToClipboard(inviteUrl);
      setNotice('同期リンクをコピーしました。');
      return inviteUrl;
    } catch {
      setError('クリップボードにコピーできませんでした。');
      setNotice('同期リンクのコピーに失敗しました。');
      return inviteUrl;
    }
  }, [createRoom, roomId]);

  const inviteUrl = useMemo(() => (roomId ? buildInviteUrl(roomId) : ''), [roomId]);

  const disconnect = useCallback(() => {
    clearBroadcastTimer();
    readyToBroadcastRef.current = false;
    queuedSnapshotRef.current = null;
    lastSentSignatureRef.current = '';
    latestAppliedStampRef.current = 0;
    setSyncRequested(false);
    setRoomId('');
    setStatus('idle');
    setError('');
    setNotice('同期を終了しました。');
  }, [clearBroadcastTimer]);

  return {
    roomId,
    inviteUrl,
    status,
    error,
    notice,
    createRoom,
    startSync,
    copyInviteLink,
    disconnect,
  };
}
