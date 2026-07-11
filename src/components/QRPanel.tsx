import { useEffect, useRef } from 'preact/hooks';
import QRCode from 'qrcode';

type Props = {
  open: boolean;
  onClose: () => void;
  url: string;
};

export function QRPanel({ open, onClose, url }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (open && url && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a', // Matches our dark mode slate
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      }).catch(err => {
        console.error('QR code generation failed', err);
      });
    }
  }, [open, url]);

  return (
    <div class={`modal-backdrop qr-backdrop ${open ? 'open' : ''}`} onClick={onClose}>
      <div class="modal-card qr-card" onClick={(e) => e.stopPropagation()}>
        <div class="settings-header">
          <h2>Scan to Join Sync</h2>
        </div>
        
        <div class="qr-container">
          <canvas ref={canvasRef} />
        </div>
        
        <p class="hint">このQRコードを相手のスマホ等でスキャンすると、すぐにこの同期ルームに参加できます。</p>
        
        <div class="sync-actions qr-actions">
          <button type="button" class="primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
