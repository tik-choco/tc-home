type Props = {
  open: boolean;
  onClose: () => void;
  roomId: string;
  inviteUrl: string;
  status: 'idle' | 'connecting' | 'connected' | 'error';
  notice: string;
  error: string;
  onCopyInvite: () => Promise<string> | string;
  onCreateRoom: () => string;
  onDisconnect: () => void;
};

function statusLabel(status: Props['status']) {
  switch (status) {
    case 'connecting':
      return '接続中';
    case 'connected':
      return '同期中';
    case 'error':
      return 'エラー';
    default:
      return '未接続';
  }
}

export function SyncPanel({
  open,
  onClose,
  roomId,
  inviteUrl,
  status,
  notice,
  error,
  onCopyInvite,
  onCreateRoom,
  onDisconnect,
}: Props) {
  return (
    <div class={`modal-backdrop ${open ? 'open' : ''}`} onClick={onClose}>
      <div class="modal-card sync-card" onClick={(event) => event.stopPropagation()}>
        <div class="settings-header">
          <div>
            <h2>Sync</h2>
            <p class="subtle">roomId を含むリンクを手動で共有します</p>
          </div>

          <div class={`sync-status-pill ${status}`} aria-label={statusLabel(status)}>
            {statusLabel(status)}
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-row">
            <label class="settings-label" for="sync-room-id">
              Room ID
            </label>
            <input
              id="sync-room-id"
              type="text"
              value={roomId || '未作成'}
              readOnly
            />
          </div>

          <div class="settings-row">
            <label class="settings-label" for="sync-invite-url">
              Invite URL
            </label>
            <input
              id="sync-invite-url"
              type="text"
              value={inviteUrl || 'リンクを作成してください'}
              readOnly
            />
          </div>

          <div class="sync-actions">
            <button type="button" class="primary" onClick={onCopyInvite}>
              リンクをコピー
            </button>
            <button type="button" onClick={onCreateRoom}>
              新しいルームを発行
            </button>
            <button type="button" class="danger" onClick={onDisconnect} disabled={!roomId}>
              同期を終了
            </button>
          </div>

          <p class="hint">
            {notice}
            {error ? ` / ${error}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
