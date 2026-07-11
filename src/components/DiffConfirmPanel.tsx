type Props = {
  open: boolean;
  onAccept: () => void;
  onDisconnect: () => void;
};

export function DiffConfirmPanel({ open, onAccept, onDisconnect }: Props) {
  if (!open) return null;

  return (
    <div class="modal-backdrop open" style={{ zIndex: 100 }}>
      <div class="modal-card sync-card">
        <div class="settings-header">
          <h2>同期の確認</h2>
        </div>
        <div class="settings-section">
          <p>
            相手のデータと差異があります。相手のデータを受け入れますか？<br />
            ※ どちらか一方が「受け入れる」を押すと、同期が完了してこの画面は閉じます。
          </p>
          <div class="sync-actions" style={{ marginTop: '24px' }}>
            <button type="button" class="danger" onClick={onDisconnect}>
              切断する
            </button>
            <button type="button" class="primary" onClick={onAccept}>
              受け入れる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
