import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { Site } from '../utils/site';
import { AppTile } from './AppTile';

type Props = {
  sites: Site[];
  isEditMode: boolean;
  onOpen: (url: string) => void;
  onRemove: (id: string) => void;
  onReorder: (newSites: Site[]) => void;
  onTileEdit: (site: Site, rect: DOMRect) => void;
  onAddClick: (rect: DOMRect) => void;
};

const MOVE_THRESHOLD = 6;
const FLIP_DURATION = 220;
const DRAG_SCALE = 1.06;

export function AppGrid({
  sites,
  isEditMode,
  onOpen,
  onRemove,
  onReorder,
  onTileEdit,
  onAddClick,
}: Props) {
  const [order, setOrder] = useState<Site[]>(sites);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const tileRefs = useRef(new Map<string, HTMLButtonElement>());
  const dragInfo = useRef<{
    id: string;
    startX: number;
    startY: number;
    moved: boolean;
    // Layout slot of the tile at drag start; the grid never reflows during
    // a drag, so this stays valid until drop.
    startRect: DOMRect;
  } | null>(null);
  const pendingFlipRects = useRef<Map<string, DOMRect> | null>(null);
  const orderRef = useRef<Site[]>(sites);
  // Tile that was just dropped; the FLIP pass animates it from its floating
  // position (still scaled) into its new slot.
  const settleId = useRef<string | null>(null);
  // The click event fires after pointerup has already torn down dragInfo,
  // so drag-vs-click suppression needs its own flag.
  const suppressClick = useRef(false);

  // Reflect external site changes while not actively dragging.
  useEffect(() => {
    if (!draggingId) {
      setOrder(sites);
      orderRef.current = sites;
    }
  }, [sites, draggingId]);

  // FLIP: animate tiles from their captured pre-reorder positions into the
  // new layout. Runs synchronously after the DOM update so nothing flashes.
  useLayoutEffect(() => {
    if (!pendingFlipRects.current) return;
    const before = pendingFlipRects.current;
    pendingFlipRects.current = null;
    const settling = settleId.current;
    settleId.current = null;

    tileRefs.current.forEach((el, id) => {
      const beforeRect = before.get(id);
      if (!beforeRect) return;
      const afterRect = el.getBoundingClientRect();
      const dx = beforeRect.left + beforeRect.width / 2 - (afterRect.left + afterRect.width / 2);
      const dy = beforeRect.top + beforeRect.height / 2 - (afterRect.top + afterRect.height / 2);
      const isSettling = id === settling;
      if (!dx && !dy && !isSettling) return;

      el.style.transition = 'none';
      el.style.transform = isSettling
        ? `translate(${dx}px, ${dy}px) scale(${DRAG_SCALE})`
        : `translate(${dx}px, ${dy}px)`;
      if (isSettling) el.style.zIndex = '10';
      requestAnimationFrame(() => {
        el.style.transition = `transform ${FLIP_DURATION}ms ease`;
        el.style.transform = '';
      });
      window.setTimeout(() => {
        el.style.transition = '';
        if (isSettling) el.style.zIndex = '';
      }, FLIP_DURATION);
    });
  }, [order]);

  const setTileRef = (id: string) => (el: HTMLButtonElement | null) => {
    if (el) tileRefs.current.set(id, el);
    else tileRefs.current.delete(id);
  };

  const captureRects = () => {
    const rects = new Map<string, DOMRect>();
    tileRefs.current.forEach((el, id) => rects.set(id, el.getBoundingClientRect()));
    return rects;
  };

  const glideBack = (el: HTMLButtonElement) => {
    el.style.transition = `transform ${FLIP_DURATION}ms ease`;
    el.style.transform = '';
    window.setTimeout(() => {
      el.style.transition = '';
      el.style.zIndex = '';
    }, FLIP_DURATION);
  };

  // Pick the slot whose center is closest to the drop point.
  const computeDropOrder = (dragId: string, x: number, y: number, startRect: DOMRect) => {
    const current = orderRef.current;
    const fromIndex = current.findIndex((s) => s.id === dragId);
    if (fromIndex === -1) return null;

    let targetIndex = fromIndex;
    let bestDist = Infinity;
    current.forEach((site, index) => {
      const rect =
        site.id === dragId ? startRect : tileRefs.current.get(site.id)?.getBoundingClientRect();
      if (!rect) return;
      const dist = Math.hypot(
        x - (rect.left + rect.width / 2),
        y - (rect.top + rect.height / 2),
      );
      if (dist < bestDist) {
        bestDist = dist;
        targetIndex = index;
      }
    });

    if (targetIndex === fromIndex) return null;
    const next = [...current];
    const [movedSite] = next.splice(fromIndex, 1);
    next.splice(targetIndex, 0, movedSite);
    return next;
  };

  const handlePointerDown = (site: Site) => (event: PointerEvent) => {
    if (!isEditMode || event.button !== 0) return;
    if ((event.target as HTMLElement).closest('.app-remove')) return;

    const el = tileRefs.current.get(site.id);
    if (!el) return;

    el.setPointerCapture(event.pointerId);
    dragInfo.current = {
      id: site.id,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      startRect: el.getBoundingClientRect(),
    };
    setDraggingId(site.id);
  };

  const handlePointerMove = (event: PointerEvent) => {
    const drag = dragInfo.current;
    if (!drag) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) > MOVE_THRESHOLD) {
      drag.moved = true;
    }
    if (!drag.moved) return;

    const el = tileRefs.current.get(drag.id);
    if (el) {
      el.style.zIndex = '10';
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${DRAG_SCALE})`;
    }
  };

  const handlePointerUp = (event: PointerEvent) => {
    const drag = dragInfo.current;
    dragInfo.current = null;
    if (!drag) return;

    const el = tileRefs.current.get(drag.id);
    if (drag.moved) {
      suppressClick.current = true;
      // The click event fires synchronously after pointerup, before timers.
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);

      const next = computeDropOrder(drag.id, event.clientX, event.clientY, drag.startRect);
      if (next) {
        pendingFlipRects.current = captureRects();
        settleId.current = drag.id;
        if (el) {
          // Drop the float transform so the post-reorder measurement sees the
          // pure slot; the FLIP pass animates from the captured position.
          el.style.transition = 'none';
          el.style.transform = '';
        }
        orderRef.current = next;
        setOrder(next);
        onReorder(next);
      } else if (el) {
        glideBack(el);
      }
    }
    setDraggingId(null);
  };

  const handlePointerCancel = () => {
    const drag = dragInfo.current;
    dragInfo.current = null;
    if (drag) {
      const el = tileRefs.current.get(drag.id);
      if (el && drag.moved) glideBack(el);
    }
    setDraggingId(null);
  };

  const handleTileClick = (site: Site) => (event: MouseEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (isEditMode) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      onTileEdit(site, rect);
    } else {
      onOpen(site.url);
    }
  };

  return (
    <section class="app-grid">
      {order.map((site) => (
        <AppTile
          key={site.id}
          site={site}
          isEditMode={isEditMode}
          className={draggingId === site.id ? 'dragging' : ''}
          innerRef={setTileRef(site.id)}
          onClick={handleTileClick(site)}
          onRemove={isEditMode ? () => onRemove(site.id) : undefined}
          draggable={isEditMode}
          onPointerDown={handlePointerDown(site)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
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
