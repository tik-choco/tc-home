import { useEffect, useMemo, useState } from 'preact/hooks';
import { normalizeUrlKey, type Site } from '../utils/site';
import { SiteIcon } from './SiteIcon';

type Props = {
  open: boolean;
  onClose: () => void;
  allApps: Site[];
  existingUrls: Set<string>;
  onAdd: (site: Site) => void;
};

export function RecommendedPanel({ open, onClose, allApps, existingUrls, onAdd }: Props) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const sorted = [...allApps].sort((a, b) => b.addedAt - a.addedAt);
    if (!needle) return sorted;
    return sorted.filter(
      (site) =>
        site.title.toLowerCase().includes(needle) || site.hostname.toLowerCase().includes(needle),
    );
  }, [allApps, query]);

  return (
    <div class={`modal-backdrop ${open ? 'open' : ''}`} onClick={onClose}>
      <div class="modal-card browse-open" onClick={(event) => event.stopPropagation()}>
        <div class="settings-header">
          <div>
            <h2>Discover</h2>
            <p class="subtle">
              {filtered.length} app{filtered.length === 1 ? '' : 's'} in the registry
            </p>
          </div>
          <button type="button" class="settings-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div class="browse-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search apps…"
            value={query}
            onInput={(event) => setQuery((event.currentTarget as HTMLInputElement).value)}
          />
        </div>

        <div class="browse-list">
          {filtered.length === 0 ? (
            <p class="subtle recommend-empty">
              {query ? `“${query}” に一致するアプリはありません。` : 'アプリが見つかりません。'}
            </p>
          ) : (
            filtered.map((site) => {
              const added = existingUrls.has(normalizeUrlKey(site.url));
              return (
                <div key={site.id} class="browse-row">
                  <div class="browse-icon" aria-hidden="true">
                    <SiteIcon
                      site={site}
                      fallback={site.title.charAt(0).toUpperCase()}
                      fallbackClass="browse-icon-fallback"
                    />
                  </div>
                  <div class="browse-meta">
                    <strong>{site.title}</strong>
                    <span>{site.hostname}</span>
                  </div>
                  <button
                    type="button"
                    class={`browse-add ${added ? 'is-added' : ''}`}
                    disabled={added}
                    aria-label={added ? `${site.title} (追加済み)` : `${site.title} を追加`}
                    onClick={() => onAdd(site)}
                  >
                    {added ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Added
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
