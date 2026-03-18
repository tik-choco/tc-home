import { useEffect, useState } from 'preact/hooks';
import { makeTitle, normalizeUrl, safeHostname, Site } from './utils/site';
import { useSites } from './hooks/useSites';
import { useAutoTitle } from './hooks/useAutoTitle';
import { useSettings } from './hooks/useSettings';
import { AddPanel } from './components/AddPanel';
import { AppGrid } from './components/AppGrid';
import { SettingsPanel } from './components/SettingsPanel';
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
  } = useSites();

  const [input, setInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [message, setMessage] = useState('URL を入力して追加できます。');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [popupStyle, setPopupStyle] = useState<Record<string, string | number> | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { isFetching } = useAutoTitle({
    url: normalizeUrl(input),
    isEnabled: isCreating,
    titleInput,
    onTitle: setTitleInput,
    onMessage: setMessage,
  });

  const {
    settings: { darkMode, backgroundUrl },
    setDarkMode,
    setBackgroundUrl,
    resetBackground,
  } = useSettings();

  const computePopupStyle = (rect: DOMRect) => {
    const margin = 8;
    const minWidth = 320;
    const maxWidth = 420;
    const availableWidth = window.innerWidth - margin * 2;
    const width = Math.min(maxWidth, Math.max(minWidth, availableWidth));
    const left = Math.min(Math.max(margin, rect.left), window.innerWidth - width - margin);
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
    setPopupStyle(null);
  }, [isEditMode, editingId, isCreating, sites]);


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

  return (
    <main class="shell">
      <AddPanel
        open={isEditMode && (isCreating || Boolean(editingId))}
        style={popupStyle}
        url={input}
        title={titleInput}
        message={message}
        isFetching={isFetching}
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
        darkMode={darkMode}
        backgroundUrl={backgroundUrl}
        onToggleDarkMode={setDarkMode}
        onBackgroundUrlChange={setBackgroundUrl}
        onUploadBackground={setBackgroundUrl}
        onResetBackground={resetBackground}
      />
    </main>
  );
}
