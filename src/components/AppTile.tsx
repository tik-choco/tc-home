import type { Site } from '../utils/site';

type Props = {
  site: Site;
  isSelected?: boolean;
  isEditMode?: boolean;
  onClick: (event: MouseEvent) => void;
  onRemove?: () => void;
  className?: string;
  draggable?: boolean;
  onDragStart?: (event: DragEvent) => void;
  onDragOver?: (event: DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: () => void;
};

export function AppTile({
  site,
  isSelected,
  isEditMode,
  onClick,
  onRemove,
  className = '',
  draggable,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: Props) {
  return (
    <button
      type="button"
      class={`app-tile ${isSelected ? 'active' : ''} ${className}`}
      draggable={draggable}
      onClick={onClick}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div class="app-icon" aria-hidden="true">
        <span class="app-icon-fallback" />
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
        ) : null}
      </div>
      <div class="app-name">
        <strong>{site.title}</strong>
      </div>
      {isEditMode && onRemove ? (
        <button
          type="button"
          class="app-remove"
          aria-label="Remove app"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      ) : null}
    </button>
  );
}
