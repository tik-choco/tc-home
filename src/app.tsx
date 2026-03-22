import { useEffect, useRef, useState, useMemo } from 'preact/hooks';
import { makeTitle, normalizeUrl, safeHostname, Site } from './utils/site';
import { useSites } from './hooks/useSites';
import { useAutoTitle } from './hooks/useAutoTitle';
import { useSettings } from './hooks/useSettings';
import { useManualSync } from './hooks/useManualSync';
import { AddPanel } from './components/AddPanel';
import { AppGrid } from './components/AppGrid';
import { SettingsPanel } from './components/SettingsPanel';
import { SyncPanel } from './components/SyncPanel';
import { DiffConfirmPanel } from './components/DiffConfirmPanel';
import { QRPanel } from './components/QRPanel';
import { SystemApps } from './components/SystemApps';

const systemApps: Site[] = [
  // {
  //   id: 'system-1',
  //   url: 'https://gdm.tik-choco.com/vrsns/',
  //   title: 'VRSNS',
  //   hostname: 'gdm.tik-choco.com',
  //   addedAt: 0,
  // }  
];

export function App() {
  const {
    sites,
    addSite,
    updateSite,
    removeSite,
    reorderSites,
    replaceSites,
  } = useSites();

  const [input, setInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [message, setMessage] = useState('URL を入力して追加できます。');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [popupStyle, setPopupStyle] = useState<Record<string, string | number> | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isDiffConfirmOpen, setIsDiffConfirmOpen] = useState(false);
  const previousPeerCountRef = useRef(0);
  const previousDiffRef = useRef(false);

  const { isFetching } = useAutoTitle({
    url: normalizeUrl(input),
    isEnabled: isCreating,
    titleInput,
    onTitle: setTitleInput,
    onMessage: setMessage,
  });

  const {
    settings,
    setDarkMode,
    setBackgroundUrl,
    replaceSettings,
    resetBackground,
    previewBackground,
  } = useSettings();

  const currentSettings = useMemo(() => ({
    darkMode: settings.darkMode,
    backgroundUrl: settings.backgroundUrl,
  }), [settings.darkMode, settings.backgroundUrl]);

  const {
    roomId,
    inviteUrl,
    status: syncStatus,
    error: syncError,
    acceptRemoteState,
    setAcceptRemoteState,
    peerCount,
    hasRemoteStateDiff,
    createRoom,
    startSync,
    copyInviteLink,
    disconnect,
  } = useManualSync({
    settings: currentSettings,
    sites,
    replaceSettings,
    replaceSites,
  });

  const computePopupStyle = (rect: DOMRect) => {
    const margin = 8;
    const minWidth = 320;
    const maxWidth = 420;
    const availableWidth = window.innerWidth - margin * 2;
    const width = Math.min(maxWidth, Math.max(minWidth, availableWidth));
    const centeredLeft = rect.left + rect.width / 2 - width / 2;
    const left = Math.min(Math.max(margin, centeredLeft), window.innerWidth - width - margin);
    const top = Math.min(rect.bottom + margin, window.innerHeight - margin);
    const maxHeight = Math.max(0, window.innerHeight - top - margin);

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`,
      maxHeight: `${maxHeight}px`,
    };
  };

  useEffect(() => {
    if (!isEditMode) {
      setEditingId(null);
      setIsCreating(false);
      setInput('');
      setTitleInput('');
      setMessage('');
      return;
    }

    if (isCreating) {
      setEditingId(null);
      setInput('');
      setTitleInput('');
      return;
    }

    if (editingId) {
      const editing = sites.find((site) => site.id === editingId);
      if (editing) {
        setInput(editing.url);
        setTitleInput(editing.title);
      }
      return;
    }

    setMessage('');
    setInput('');
    setTitleInput('');
  }, [isEditMode, editingId, isCreating, sites]);

  useEffect(() => {
    if (syncStatus === 'connected' && hasRemoteStateDiff && !acceptRemoteState) {
      setIsDiffConfirmOpen(true);
      return;
    }

    if (!hasRemoteStateDiff) {
      setIsDiffConfirmOpen(false);
    }
  }, [syncStatus, hasRemoteStateDiff]);

  const saveSite = () => {
    const url = normalizeUrl(input);
    if (!url) {
      setMessage('URL を入力してください。');
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      setMessage('URL 形式が正しくありません。');
      return;
    }

    const hostname = safeHostname(parsed.toString());
    const title = titleInput || makeTitle(hostname);

    if (editingId) {
      updateSite(editingId, {
        url: parsed.toString(),
        title,
        hostname,
      });
      setMessage('サイト情報を更新しました。');
    } else {
      const newSite: Site = {
        id: crypto.randomUUID(),
        url: parsed.toString(),
        title,
        hostname,
        addedAt: Date.now(),
      };
      addSite(newSite);
      setMessage('サイトを追加しました。');
    }

    setEditingId(null);
    setIsCreating(false);
    setInput('');
    setTitleInput('');
  };

  const handleRemoveSite = (id: string) => {
    removeSite(id);
    setMessage('サイトを削除しました。');
  };

  const handleTileEdit = (site: Site, rect: DOMRect) => {
    setPopupStyle(computePopupStyle(rect));
    setIsCreating(false);
    setEditingId(site.id);
    setInput(site.url);
    setTitleInput(site.title);
  };

  const handleAddClick = (rect: DOMRect) => {
    setPopupStyle(computePopupStyle(rect));
    setIsCreating(true);
    setEditingId(null);
    setInput('');
    setTitleInput('');
    setMessage('URL を入力して追加できます。');
  };

  const handleCloseAddPanel = () => {
    setIsCreating(false);
    setEditingId(null);
  };

  const handleOpenSync = () => {
    setIsSyncOpen(true);
  };

  return (
    <main class="shell">
      <AddPanel
        open={isEditMode && (isCreating || Boolean(editingId))}
        style={popupStyle}
        url={input}
        title={titleInput}
        message={message}
        isFetching={isFetching}
        onClose={handleCloseAddPanel}
        onUrlChange={setInput}
        onTitleChange={setTitleInput}
        onSave={saveSite}
      />

      <SystemApps
        apps={systemApps}
        isEditMode={isEditMode}
        onToggleEdit={() => setIsEditMode((prev) => !prev)}
        onOpen={(url) => window.open(url, '_blank', 'noopener,noreferrer')}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSync={handleOpenSync}
        isSyncOpen={isSyncOpen}
        onAddRecommended={(site) => {
          addSite({
            ...site,
            id: crypto.randomUUID(),
            addedAt: Date.now(),
          });
        }}
      />

      <AppGrid
        sites={sites}
        isEditMode={isEditMode}
        onOpen={(url) => window.open(url, '_blank', 'noopener,noreferrer')}
        onRemove={handleRemoveSite}
        onReorder={reorderSites}
        onTileEdit={handleTileEdit}
        onAddClick={handleAddClick}
      />

      <SettingsPanel
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        darkMode={settings.darkMode}
        backgroundUrl={settings.backgroundUrl}
        previewUrl={previewBackground}
        onToggleDarkMode={setDarkMode}
        onBackgroundUrlChange={setBackgroundUrl}
        onUploadBackground={setBackgroundUrl}
        onResetBackground={resetBackground}
      />

      <DiffConfirmPanel
        open={isDiffConfirmOpen}
        onAccept={() => {
          setAcceptRemoteState(true);
          setIsDiffConfirmOpen(false);
          setIsSyncOpen(false);
        }}
        onDisconnect={() => {
          disconnect();
          setIsDiffConfirmOpen(false);
        }}
      />

      <SyncPanel
        open={isSyncOpen}
        onClose={() => setIsSyncOpen(false)}
        roomId={roomId}
        status={syncStatus}
        error={syncError}
        peerCount={peerCount}
        onCopyInvite={copyInviteLink}
        onStartSync={startSync}
        onShowQR={() => setIsQrOpen(true)}
        onDisconnect={disconnect}
      />

      <QRPanel
        open={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        url={inviteUrl}
      />
    </main>
  );
}
