import { getMistNode } from '../utils/mist';

type Props = {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  backgroundUrl: string;
  previewUrl: string;
  onToggleDarkMode: (next: boolean) => void;
  onBackgroundUrlChange: (url: string) => void;
  onResetBackground: () => void;
  onUploadBackground: (url: string) => void;
};

export function SettingsPanel({
  open,
  onClose,
  darkMode,
  backgroundUrl,
  previewUrl,
  onToggleDarkMode,
  onBackgroundUrlChange,
  onResetBackground,
  onUploadBackground,
}: Props) {
  const handleFileChange = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const node = await getMistNode();
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      const cid = await node.storageSet(file.name, data);
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
            <label class="settings-label toggle">
              <input
                type="checkbox"
                checked={darkMode}
                onInput={(event) =>
                  onToggleDarkMode((event.currentTarget as HTMLInputElement).checked)
                }
              />
              <span class="toggle-switch" aria-hidden="true" />
              Dark mode
            </label>
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
