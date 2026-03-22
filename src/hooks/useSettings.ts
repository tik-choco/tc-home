import { useEffect, useMemo, useState } from 'preact/hooks';

export type Settings = {
  darkMode: boolean;
  backgroundUrl: string;
};

const STORAGE_KEY = 'tc-home-settings';

const defaultSettings: Settings = {
  darkMode: true,
  backgroundUrl: '',
};

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const { darkMode, backgroundUrl } = settings;

    document.documentElement.classList.toggle('light', !darkMode);

    const bgValue = backgroundUrl ? `url(${backgroundUrl})` : 'none';
    document.documentElement.style.setProperty('--custom-bg', bgValue);
  }, [settings]);

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

  const previewBackground = useMemo(() => settings.backgroundUrl, [settings.backgroundUrl]);

  return {
    settings,
    setDarkMode,
    setBackgroundUrl,
    replaceSettings,
    resetBackground,
    previewBackground,
  };
}
