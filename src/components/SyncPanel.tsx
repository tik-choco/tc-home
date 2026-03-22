type Props = {
  open: boolean;
  onClose: () => void;
  roomId: string;
  status: 'idle' | 'connecting' | 'connected' | 'error';
  notice: string;
  error: string;
  acceptRemoteSettings: boolean;
  peerCount: number;
  onCopyInvite: () => Promise<string> | string;
  onCreateRoom: () => string;
  onStartSync: () => string;
  onDisconnect: () => void;
  onToggleAcceptRemoteSettings: (next: boolean) => void;
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
  status,
  notice,
  error,
  acceptRemoteSettings,
  peerCount,
  onCopyInvite,
  onCreateRoom,
  onStartSync,
  onDisconnect,
  onToggleAcceptRemoteSettings,
}: Props) {
  const isActive = status === 'connecting' || status === 'connected';
  const hasPeer = peerCount > 0;

  return (
    <div class={`modal-backdrop ${open ? 'open' : ''}`} onClick={onClose}>
      <div class="modal-card sync-card" onClick={(event) => event.stopPropagation()}>
        <div class="settings-header">
          <div>
            <h2>Sync</h2>
            <p class="subtle">roomId を含むリンクを手動で共有します</p>
          </div>

          <div class="sync-header-right">
            <div class={`sync-status-pill ${status}`} aria-label={statusLabel(status)}>
              {statusLabel(status)}
            </div>
            <div class="sync-count" aria-label={`接続中の人数 ${peerCount} 人`}>
              {peerCount} 人
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-row sync-room-row">
            <label class="settings-label" for="sync-room-id">
              Room ID
            </label>
            <div class="sync-inline">
              <input
                id="sync-room-id"
                type="text"
                value={roomId || '未作成'}
                readOnly
              />
              <button type="button" onClick={onCreateRoom}>
                新しいルームを発行
              </button>
              <button type="button" class="primary" onClick={onCopyInvite}>
                リンクをコピー
              </button>
            </div>
          </div>

          <div class="sync-actions">
            {isActive ? (
              <button type="button" class="danger" onClick={onDisconnect} disabled={!roomId}>
                同期を終了
              </button>
            ) : (
              <button type="button" class="primary" onClick={onStartSync}>
                同期を開始
              </button>
            )}
          </div>

          {hasPeer ? (
            <div class="settings-row">
              <label class="settings-label toggle">
                <input
                  type="checkbox"
                  checked={acceptRemoteSettings}
                  onInput={(event) =>
                    onToggleAcceptRemoteSettings((event.currentTarget as HTMLInputElement).checked)
                  }
                />
                <span class="toggle-switch" aria-hidden="true" />
                相手の設定も受け取る
              </label>
              <p class="subtle">オンにすると、受信した設定で自分の設定を上書きします。</p>
            </div>
          ) : (
            <p class="subtle">相手が接続したら、設定を受け取るボタンが表示されます。</p>
          )}

          <p class="hint">
            {notice}
            {error ? ` / ${error}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
