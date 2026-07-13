import { useEffect, useMemo, useState } from 'preact/hooks';
import { storage_get } from '../vendor/mistlib/wrappers/web/index.js';
import { readDeviceId } from '../utils/device';

export type ThemeMode = 'light' | 'dark' | 'auto';

export type TileStyle = 'standard' | 'frosted';

export type Settings = {
  theme: ThemeMode;
  backgroundUrl: string;
  tileStyle: TileStyle;
  accentColor: string;
};

const STORAGE_KEY = 'tc-home-settings';

const defaultSettings: Settings = {
  theme: 'auto',
  backgroundUrl: '',
  tileStyle: 'standard',
  accentColor: '',
};

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

// Reads settings written by an older build (a plain `darkMode: boolean`
// instead of the light/dark/auto `theme` field) and carries the user's
// existing explicit choice forward so upgrading doesn't flip anyone's theme.
function migrateSettings(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object') return defaultSettings;
  const value = raw as Record<string, unknown>;
  const backgroundUrl = typeof value.backgroundUrl === 'string' ? value.backgroundUrl : '';
  const tileStyle: TileStyle =
    value.tileStyle === 'standard' || value.tileStyle === 'frosted' ? value.tileStyle : 'standard';
  const accentColor =
    typeof value.accentColor === 'string' && HEX_COLOR_RE.test(value.accentColor) ? value.accentColor : '';

  if (value.theme === 'light' || value.theme === 'dark' || value.theme === 'auto') {
    return { theme: value.theme, backgroundUrl, tileStyle, accentColor };
  }
  if (typeof value.darkMode === 'boolean') {
    return { theme: value.darkMode ? 'dark' : 'light', backgroundUrl, tileStyle, accentColor };
  }
  return { ...defaultSettings, backgroundUrl, tileStyle, accentColor };
}

import { getMistNode } from '../utils/mist';
import { applyAccent } from '../utils/accent';

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

  useEffect(() => {
    // Tile glass style is a per-icon visual choice, independent of whether
    // a custom background is set, so it applies unconditionally.
    if (settings.tileStyle !== 'standard') {
      document.documentElement.dataset.tileStyle = settings.tileStyle;
    } else {
      delete document.documentElement.dataset.tileStyle;
    }
  }, [settings.tileStyle]);

  useEffect(() => {
    applyAccent(settings.accentColor);
  }, [settings.accentColor]);

  useEffect(() => {
    // Hook for CSS to protect text legibility over a custom wallpaper.
    if (resolvedBackground) {
      document.documentElement.dataset.hasBg = 'true';
    } else {
      delete document.documentElement.dataset.hasBg;
    }
  }, [resolvedBackground]);

  const setTheme = (value: ThemeMode) => {
    setSettings((prev) => ({ ...prev, theme: value }));
  };

  const setBackgroundUrl = (value: string) => {
    setSettings((prev) => ({ ...prev, backgroundUrl: value }));
  };

  const setTileStyle = (value: TileStyle) => {
    setSettings((prev) => ({ ...prev, tileStyle: value }));
  };

  const setAccentColor = (value: string) => {
    setSettings((prev) => ({ ...prev, accentColor: value }));
  };

  const replaceSettings = (next: Settings) => {
    // Remote peers may be running an older build whose synced Settings
    // object is missing fields we've since added — merge over the
    // defaults so a partial payload can't leave state half-populated.
    setSettings({ ...defaultSettings, ...next });
  };

  const resetBackground = () => setBackgroundUrl('');

  const previewBackground = useMemo(() => resolvedBackground, [resolvedBackground]);

  return {
    settings,
    setTheme,
    setBackgroundUrl,
    setTileStyle,
    setAccentColor,
    replaceSettings,
    resetBackground,
    previewBackground,
  };
}
