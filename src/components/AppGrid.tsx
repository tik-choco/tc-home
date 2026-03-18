import { useState } from 'preact/hooks';
import type { Site } from '../utils/site';
import { AppTile } from './AppTile';

type Props = {
  sites: Site[];
  isEditMode: boolean;
  onOpen: (url: string) => void;
  onRemove: (id: string) => void;
  onReorder: (fromId: string, toId: string) => void;
  onTileEdit: (site: Site, rect: DOMRect) => void;
  onAddClick: (rect: DOMRect) => void;
};

export function AppGrid({
  sites,
  isEditMode,
  onOpen,
  onRemove,
  onReorder,
  onTileEdit,
  onAddClick,
}: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  return (
    <section class="app-grid">
      {sites.map((site) => (
        <AppTile
          key={site.id}
          site={site}
          isEditMode={isEditMode}
          className={dragOverId === site.id ? 'drag-over' : ''}
          onClick={(event) => {
            if (isEditMode) {
              const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
              onTileEdit(site, rect);
            } else {
              onOpen(site.url);
            }
          }}
          onRemove={isEditMode ? () => onRemove(site.id) : undefined}
          draggable={isEditMode}
          onDragStart={() => {
            if (!isEditMode) return;
            setDraggingId(site.id);
          }}
          onDragOver={(event: DragEvent) => {
            if (!isEditMode) return;
            event.preventDefault();
            setDragOverId(site.id);
          }}
          onDragLeave={() => {
            if (!isEditMode) return;
            setDragOverId(null);
          }}
          onDrop={() => {
            if (!isEditMode || !draggingId) return;
            onReorder(draggingId, site.id);
            setDragOverId(null);
            setDraggingId(null);
          }}
        />
      ))}

      {isEditMode ? (
        <button
          type="button"
          class="app-tile app-add"
          onClick={(event) => {
            const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
            onAddClick(rect);
          }}
        >
          <div class="app-icon" aria-hidden="true">
            <span class="app-icon-fallback">+</span>
          </div>
          <div class="app-name">
            <strong>Add App</strong>
          </div>
        </button>
      ) : null}
    </section>
  );
}
