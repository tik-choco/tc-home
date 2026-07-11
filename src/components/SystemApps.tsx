import { useMemo, useState } from 'preact/hooks';
import { normalizeUrlKey, type Site } from '../utils/site';
import { useRecommendedApps } from '../hooks/useRecommendedApps';
import { AppTile } from './AppTile';
import { RecommendedPanel } from './RecommendedPanel';
import { SystemIconTile } from './SystemIconTile';

type Props = {
  apps: Site[];
  sites: Site[];
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
  sites,
  isEditMode,
  onToggleEdit,
  onOpen,
  onOpenSettings,
  onOpenSync,
  isSyncOpen,
  onAddRecommended,
}: Props) {
  const { recommended } = useRecommendedApps();
  const [showRecommended, setShowRecommended] = useState(false);

  const existingUrls = useMemo(
    () => new Set(sites.map((site) => normalizeUrlKey(site.url))),
    [sites],
  );

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
        allApps={recommended}
        existingUrls={existingUrls}
        onAdd={onAddRecommended}
      />
    </>
  );
}
