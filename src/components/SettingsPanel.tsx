import { storage_add } from '../vendor/mistlib/wrappers/web/index.js';
import { getMistNode } from '../utils/mist';
import { requestOnboarding } from '../lib/onboarding';
import type { ThemeMode, TileStyle } from '../hooks/useSettings';

type Props = {
  open: boolean;
  onClose: () => void;
  theme: ThemeMode;
  backgroundUrl: string;
  previewUrl: string;
  tileStyle: TileStyle;
  accentColor: string;
  onThemeChange: (next: ThemeMode) => void;
  onBackgroundUrlChange: (url: string) => void;
  onResetBackground: () => void;
  onUploadBackground: (url: string) => void;
  onTileStyleChange: (next: TileStyle) => void;
  onAccentColorChange: (next: string) => void;
};

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'ライト' },
  { value: 'dark', label: 'ダーク' },
  { value: 'auto', label: '自動' },
];

const TILE_STYLE_OPTIONS: { value: TileStyle; label: string }[] = [
  { value: 'standard', label: '標準' },
  { value: 'frosted', label: 'くもりガラス' },
];

const ACCENT_PRESETS: { value: string; label: string }[] = [
  { value: '', label: 'ティール' },
  { value: '#2563eb', label: 'ブルー' },
  { value: '#7c3aed', label: 'パープル' },
  { value: '#db2777', label: 'ピンク' },
  { value: '#ea580c', label: 'オレンジ' },
  { value: '#16a34a', label: 'グリーン' },
];

const DEFAULT_ACCENT_HEX = '#0d9488';

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

function AutoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function themeIcon(value: ThemeMode) {
  if (value === 'light') return <SunIcon />;
  if (value === 'dark') return <MoonIcon />;
  return <AutoIcon />;
}

export function SettingsPanel({
  open,
  onClose,
  theme,
  backgroundUrl,
  previewUrl,
  tileStyle,
  accentColor,
  onThemeChange,
  onBackgroundUrlChange,
  onResetBackground,
  onUploadBackground,
  onTileStyleChange,
  onAccentColorChange,
}: Props) {
  const handleFileChange = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      await getMistNode();
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      const cid = await storage_add(file.name, data);
      onUploadBackground(`mist:${cid}`);
    } catch (e) {
      console.error('Failed to upload to mist storage:', e);
    }
  };

  return (
    <div class={`modal-backdrop ${open ? 'open' : ''}`} onClick={onClose}>
      <div class="modal-card" onClick={(event) => event.stopPropagation()}>
        <div class="settings-header">
          <div>
            <h2>Settings</h2>
            <p class="subtle">Customize theme and background</p>
          </div>

          <button type="button" class="settings-close" onClick={onClose} aria-label="Close settings">
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div class="settings-section">
          <div class="settings-row">
            <span class="settings-label">テーマ</span>
            <div class="theme-switch" role="group" aria-label="テーマを選択">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={theme === option.value}
                  onClick={() => onThemeChange(option.value)}
                >
                  {themeIcon(option.value)}
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div class="settings-row">
            <span class="settings-label">アイコンの背景</span>
            <div class="theme-switch" role="group" aria-label="アイコンの背景スタイルを選択">
              {TILE_STYLE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={tileStyle === option.value}
                  onClick={() => onTileStyleChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p class="subtle">背景画像の上でアイコンと文字を読みやすくするスタイルを選べます</p>
          </div>

          <div class="settings-row">
            <span class="settings-label">アクセントカラー</span>
            <div class="accent-swatches" role="group" aria-label="アクセントカラーを選択">
              {ACCENT_PRESETS.map((preset) => {
                const selected = accentColor === preset.value;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    class="accent-swatch"
                    style={`background: ${preset.value || DEFAULT_ACCENT_HEX};`}
                    aria-pressed={selected}
                    aria-label={preset.label}
                    onClick={() => onAccentColorChange(preset.value)}
                  />
                );
              })}
              <input
                type="color"
                aria-label="アクセントカラーを自由選択"
                value={accentColor || DEFAULT_ACCENT_HEX}
                onInput={(event) =>
                  onAccentColorChange((event.currentTarget as HTMLInputElement).value)
                }
              />
            </div>
            {accentColor ? (
              <button type="button" class="link-reset" onClick={() => onAccentColorChange('')}>
                既定に戻す
              </button>
            ) : null}
          </div>

          <div class="settings-row">
            <label class="settings-label" for="background-url">
              Background image URL
            </label>
            <input
              id="background-url"
              type="text"
              value={backgroundUrl}
              placeholder="https://example.com/photo.jpg"
              onInput={(event) =>
                onBackgroundUrlChange((event.currentTarget as HTMLInputElement).value)
              }
            />
          </div>

          <div class="settings-row">
            <label class="settings-label" for="background-upload">
              Upload image
            </label>
            <input
              id="background-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>

          {backgroundUrl ? (
            <div class="settings-row">
              <button type="button" class="danger" onClick={onResetBackground}>
                Reset background
              </button>
            </div>
          ) : null}
        </div>

        <div class="settings-section">
          <div class="settings-row">
            <label class="settings-label">チュートリアル</label>
            <button
              type="button"
              onClick={() => {
                requestOnboarding();
                onClose();
              }}
            >
              チュートリアルをもう一度見る
            </button>
          </div>
        </div>

        {previewUrl ? (
          <div class="preview-wrap">
            <div class="preview-head">Preview</div>
            <div class="preview" style={`background-image: url(${previewUrl});`} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
