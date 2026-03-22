import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Site } from '../utils/site';
import { AppTile } from './AppTile';
import { RecommendedPanel } from './RecommendedPanel';
import { SystemIconTile } from './SystemIconTile';

const RECOMMENDED_URL = 'https://raw.githubusercontent.com/tik-choco/tc-registry/main/apps.json';

type Props = {
  apps: Site[];
  isEditMode: boolean;
  onToggleEdit: () => void;
  onOpen: (url: string) => void;
  onOpenSettings: () => void;
  onOpenSync: () => void;
  isSyncOpen: boolean;
  onAddRecommended: (site: Site) => void;
};

export function SystemApps({
  apps,
  isEditMode,
  onToggleEdit,
  onOpen,
  onOpenSettings,
  onOpenSync,
  isSyncOpen,
  onAddRecommended,
}: Props) {
  const [recommended, setRecommended] = useState<Site[]>([]);
  const [showRecommended, setShowRecommended] = useState(false);

  const latest = useMemo(() => {
    return [...recommended]
      .sort((a, b) => b.addedAt - a.addedAt)
      .slice(0, 4);
  }, [recommended]);

  useEffect(() => {
    let canceled = false;
    fetch(RECOMMENDED_URL)
      .then((res) => res.json())
      .then((data: Site[]) => {
        if (canceled || !Array.isArray(data)) return;
        setRecommended(data);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      canceled = true;
    };
  }, []);

  return (
    <>
      <section class="system-grid">
        {apps.map((site) => (
          <AppTile
            key={site.id}
            site={site}
            onClick={() => onOpen(site.url)}
            className="system-tile"
          />
        ))}

        <SystemIconTile
          icon="app"
          title="Discover"
          onClick={() => setShowRecommended(true)}
          className={`system-tile ${showRecommended ? 'active' : ''}`}
          active={showRecommended}
        />

        <SystemIconTile
          icon="settings"
          title="Settings"
          onClick={onOpenSettings}
          className="system-tile"
        />

        <SystemIconTile
          icon="sync"
          title="Sync"
          onClick={onOpenSync}
          className={`system-tile ${isSyncOpen ? 'active' : ''}`}
          active={isSyncOpen}
        />

        <SystemIconTile
          icon="edit"
          title={isEditMode ? 'Done' : 'Edit'}
          onClick={onToggleEdit}
          className={`system-tile edit-toggle ${isEditMode ? 'active' : ''}`}
          active={isEditMode}
        />
      </section>

      <RecommendedPanel
        open={showRecommended}
        onClose={() => setShowRecommended(false)}
        recommended={latest}
        onAdd={(site) => {
          onAddRecommended(site);
          setShowRecommended(false);
        }}
      />
    </>
  );
}
