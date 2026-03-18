import type { Site } from '../utils/site';
import { AppTile } from './AppTile';
import { SystemIconTile } from './SystemIconTile';

type Props = {
  apps: Site[];
  isEditMode: boolean;
  onToggleEdit: () => void;
  onOpen: (url: string) => void;
  onOpenSettings: () => void;
};

export function SystemApps({ apps, isEditMode, onToggleEdit, onOpen, onOpenSettings }: Props) {
  return (
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
        icon="settings"
        title="Settings"
        onClick={onOpenSettings}
        className="system-tile"
      />

      <SystemIconTile
        icon="edit"
        title={isEditMode ? 'Done' : 'Edit'}
        onClick={onToggleEdit}
        className={`system-tile edit-toggle ${isEditMode ? 'active' : ''}`}
        active={isEditMode}
      />
    </section>
  );
}
