import { useEffect, useMemo, useState } from 'preact/hooks';
import { storage_get } from '../vendor/mistlib/wrappers/web/index.js';
import { readDeviceId } from '../utils/device';

export type ThemeMode = 'light' | 'dark' | 'auto';

export type Settings = {
  theme: ThemeMode;
  backgroundUrl: string;
};

const STORAGE_KEY = 'tc-home-settings';

const defaultSettings: Settings = {
  theme: 'auto',
  backgroundUrl: '',
};

// Reads settings written by an older build (a plain `darkMode: boolean`
// instead of the light/dark/auto `theme` field) and carries the user's
// existing explicit choice forward so upgrading doesn't flip anyone's theme.
function migrateSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object') return defaultSettings;
  const value = raw as Record<string, unknown>;
  const backgroundUrl = typeof value.backgroundUrl === 'string' ? value.backgroundUrl : '';

  if (value.theme === 'light' || value.theme === 'dark' || value.theme === 'auto') {
    return { theme: value.theme, backgroundUrl };
  }
  if (typeof value.darkMode === 'boolean') {
    return { theme: value.darkMode ? 'dark' : 'light', backgroundUrl };
  }
  return { ...defaultSettings, backgroundUrl };
}

import { getMistNode } from '../utils/mist';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;

    try {
      return migrateSettings(JSON.parse(raw));
    } catch {
      return defaultSettings;
    }
  });

  const [resolvedBackground, setResolvedBackground] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage full — settings stay in effect for this session but won't
      // persist across reload until space frees up.
    }
  }, [settings]);

  useEffect(() => {
    let active = true;
    let blobUrl = '';

    const resolve = async () => {
      const url = settings.backgroundUrl;
      if (url.startsWith('mist:')) {
        try {
          await getMistNode();
          const cid = url.slice(5);
          const data = await storage_get(cid);
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
    const { theme } = settings;

    if (theme === 'auto') {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = theme;
    }

    const bgValue = resolvedBackground ? `url(${resolvedBackground})` : 'none';
    document.documentElement.style.setProperty('--custom-bg', bgValue);
  }, [settings.theme, resolvedBackground]);

  const setTheme = (value: ThemeMode) => {
    setSettings((prev) => ({ ...prev, theme: value }));
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
    setTheme,
    setBackgroundUrl,
    replaceSettings,
    resetBackground,
    previewBackground,
  };
}
