type Props = {
  open: boolean;
  style?: Record<string, string | number> | null;
  url: string;
  title: string;
  message: string;
  isFetching: boolean;
  onClose: () => void;
  onUrlChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onSave: () => void;
};

export function AddPanel({
  open,
  style,
  url,
  title,
  message,
  isFetching,
  onClose,
  onUrlChange,
  onTitleChange,
  onSave,
}: Props) {
  return (
    <div class={`add-panel-backdrop ${open ? 'open' : ''}`} onClick={onClose}>
      <div
        class={`add-panel ${open ? 'open' : ''}`}
        style={style ?? undefined}
        onClick={(event) => event.stopPropagation()}
      >
        <div class="add-card">
          <label for="site-url">Web site URL</label>
          <div class="add-row">
            <input
              id="site-url"
              type="url"
              value={url}
              placeholder="https://example.com"
              onInput={(event) => onUrlChange((event.currentTarget as HTMLInputElement).value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onSave();
              }}
            />
          </div>
          <label for="site-title">Title (optional)</label>
          <div class="add-row">
            <input
              id="site-title"
              type="text"
              value={title}
              placeholder="App name"
              onInput={(event) => onTitleChange((event.currentTarget as HTMLInputElement).value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onSave();
              }}
            />
            <button type="button" onClick={onSave} class="primary" disabled={isFetching}>
              保存
            </button>
          </div>
          <p class="hint">{message}</p>
        </div>
      </div>
    </div>
  );
}
