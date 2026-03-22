import { useEffect, useMemo, useState } from 'preact/hooks';
import { MistNode } from '../mistlib/wrappers/web/index.js';
import { readDeviceId } from '../utils/device';

export type Settings = {
  darkMode: boolean;
  backgroundUrl: string;
};

const STORAGE_KEY = 'tc-home-settings';

const defaultSettings: Settings = {
  darkMode: true,
  backgroundUrl: '',
};

import { getMistNode } from '../utils/mist';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;

    try {
      return JSON.parse(raw) as Settings;
    } catch {
      return defaultSettings;
    }
  });

  const [resolvedBackground, setResolvedBackground] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    let active = true;
    let blobUrl = '';

    const resolve = async () => {
      const url = settings.backgroundUrl;
      if (url.startsWith('mist:')) {
        try {
          const node = await getMistNode();
          const cid = url.slice(5);
          const data = await node.storageGet(cid);
          if (active) {
            const blob = new Blob([data as any]);
            blobUrl = URL.createObjectURL(blob);
            setResolvedBackground(blobUrl);
          }
        } catch (e) {
          console.error('Failed to resolve mist background:', e);
          if (active) setResolvedBackground('');
        }
      } else {
        if (active) setResolvedBackground(url);
      }
    };

    resolve();

    return () => {
      active = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [settings.backgroundUrl]);

  useEffect(() => {
    const { darkMode } = settings;

    document.documentElement.classList.toggle('light', !darkMode);

    const bgValue = resolvedBackground ? `url(${resolvedBackground})` : 'none';
    document.documentElement.style.setProperty('--custom-bg', bgValue);
  }, [settings.darkMode, resolvedBackground]);

  const setDarkMode = (value: boolean) => {
    setSettings((prev) => ({ ...prev, darkMode: value }));
  };

  const setBackgroundUrl = (value: string) => {
    setSettings((prev) => ({ ...prev, backgroundUrl: value }));
  };

  const replaceSettings = (next: Settings) => {
    setSettings(next);
  };

  const resetBackground = () => setBackgroundUrl('');

  const previewBackground = useMemo(() => resolvedBackground, [resolvedBackground]);

  return {
    settings,
    setDarkMode,
    setBackgroundUrl,
    replaceSettings,
    resetBackground,
    previewBackground,
  };
}
