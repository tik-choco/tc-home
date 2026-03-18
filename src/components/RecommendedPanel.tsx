import type { Site } from '../utils/site';

type Props = {
  open: boolean;
  onClose: () => void;
  recommended: Site[];
  onAdd: (site: Site) => void;
};

export function RecommendedPanel({ open, onClose, recommended, onAdd }: Props) {
  return (
    <div class={`modal-backdrop ${open ? 'open' : ''}`} onClick={onClose}>
      <div class="modal-card" onClick={(event) => event.stopPropagation()}>
        <div class="settings-header">
          <div>
            <h2>Recommended</h2>
            <p class="subtle">Add one of these apps to your list</p>
          </div>
          <button type="button" class="settings-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div class="recommend-list">
          {recommended.map((site) => (
            <button
              key={site.id}
              type="button"
              class="app-tile app-add"
              onClick={() => onAdd(site)}
            >
              <div class="app-icon" aria-hidden="true">
                {site.url ? (
                  <img
                    class="app-icon-img"
                    src={`https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(
                      site.url,
                    )}`}
                    alt=""
                    loading="lazy"
                    onError={(event) => {
                      (event.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span class="app-icon-fallback">+</span>
                )}
              </div>
              <div class="app-name">
                <strong>{site.title}</strong>
              </div>
            </button>
          ))}
        </div>

        <div class="recommend-footer">
          <a
            class="recommend-more"
            href="https://raw.githubusercontent.com/tik-choco/tc-registry/main/apps.json"
            target="_blank"
            rel="noreferrer"
          >
            View all recommended apps
          </a>
        </div>
      </div>
    </div>
  );
}
