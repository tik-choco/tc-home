import type { Site } from '../utils/site';
import { SiteIcon } from './SiteIcon';

type Props = {
  site: Site;
  isEditMode?: boolean;
  onClick: (event: MouseEvent) => void;
  onRemove?: () => void;
  className?: string;
  draggable?: boolean;
  innerRef?: (el: HTMLButtonElement | null) => void;
  onPointerDown?: (event: PointerEvent) => void;
  onPointerMove?: (event: PointerEvent) => void;
  onPointerUp?: (event: PointerEvent) => void;
  onPointerCancel?: (event: PointerEvent) => void;
};

export function AppTile({
  site,
  isEditMode,
  onClick,
  onRemove,
  className = '',
  draggable,
  innerRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: Props) {
  return (
    <button
      type="button"
      ref={innerRef}
      class={`app-tile ${draggable ? 'app-tile--draggable' : ''} ${className}`}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div class="app-icon" aria-hidden="true">
        <span class="app-icon-fallback" />
        <SiteIcon site={site} class="app-icon-img" />
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
