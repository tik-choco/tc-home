type Props = {
  title: string;
  onClick: () => void;
  className?: string;
  icon: 'settings' | 'edit' | 'app';
  active?: boolean;
};

export function SystemIconTile({ title, onClick, className = '', icon, active }: Props) {
  return (
    <button
      type="button"
      class={`app-tile system-tile ${active ? 'active' : ''} ${className}`}
      onClick={onClick}
    >
      <div class={`system-icon ${icon}`} aria-hidden="true">
        {icon === 'settings' ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
            <path d="M19 12a7.1 7.1 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-4l-.3 3.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7.1 7.1 0 0 0 0 2L4.1 14.5l2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 3.1h4l.3-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.6.1-1Z" />
          </svg>
        ) : icon === 'edit' ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="m4 20 3.5-.8 11-11a1.7 1.7 0 0 0 0-2.5l-1.2-1.2a1.7 1.7 0 0 0-2.5 0l-11 11L3 18.5 4 20Z" />
            <path d="m14.8 5.2 4 4" />
          </svg>
        ) : null}
      </div>
      <div class="system-copy">
        <strong>{title}</strong>
      </div>
    </button>
  );
}
