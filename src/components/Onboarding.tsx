import { useMemo, useState } from 'preact/hooks';
import { normalizeUrlKey, type Site } from '../utils/site';
import { useRecommendedApps } from '../hooks/useRecommendedApps';
import { SiteIcon } from './SiteIcon';

// First-run guide shown by app.tsx as a modal overlay. Every step can be
// skipped via the × button; closing at any point counts as "done" — the
// completion flag itself is owned by the caller through `onClose`.

const STEP_COUNT = 4;

function HomeIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="m4 20 3.5-.8 11-11a1.7 1.7 0 0 0 0-2.5l-1.2-1.2a1.7 1.7 0 0 0-2.5 0l-11 11L3 18.5 4 20Z" />
      <path d="m14.8 5.2 4 4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function DragIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="9" cy="6" r="1.2" />
      <circle cx="15" cy="6" r="1.2" />
      <circle cx="9" cy="12" r="1.2" />
      <circle cx="15" cy="12" r="1.2" />
      <circle cx="9" cy="18" r="1.2" />
      <circle cx="15" cy="18" r="1.2" />
    </svg>
  );
}

function DiscoverIcon(props: { size?: number }) {
  const size = props.size ?? 40;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <polyline points="8 12.5 11 15.5 16 9" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
      <path d="M19 12a7.1 7.1 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-4l-.3 3.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7.1 7.1 0 0 0 0 2L4.1 14.5l2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 3.1h4l.3-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.6.1-1Z" />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 12a8 8 0 0 1 13.3-5.9L19 8" />
      <path d="M20 12a8 8 0 0 1-13.3 5.9L5 16" />
      <path d="M19 4v4h-4" />
      <path d="M5 20v-4h4" />
    </svg>
  );
}

type Props = {
  sites: Site[];
  onAdd: (site: Site) => void;
  onClose: () => void;
};

export function Onboarding(props: Props) {
  const [step, setStep] = useState(0);
  const { recommended, isLoading } = useRecommendedApps();

  const existingUrls = useMemo(
    () => new Set(props.sites.map((site) => normalizeUrlKey(site.url))),
    [props.sites],
  );
  const sortedRecommended = useMemo(
    () => [...recommended].sort((a, b) => b.addedAt - a.addedAt),
    [recommended],
  );

  return (
    <div class="ob-overlay">
      <div class="ob-card" role="dialog" aria-modal="true" aria-label="TC Home の使い方">
        <button type="button" class="ob-close" onClick={props.onClose} aria-label="閉じる">
          ×
        </button>

        {step === 0 && (
          <div class="ob-body">
            <div class="ob-hero">
              <HomeIcon />
            </div>
            <h2 class="ob-title">TC Home へようこそ！</h2>
            <p class="ob-desc">
              TC Home は、よく使うサイトやアプリをタイルとして並べておける、あなただけのホーム画面です。
            </p>
            <p class="ob-desc">
              まずは使ってみたいアプリを選ぶところから始めましょう。
            </p>
          </div>
        )}

        {step === 1 && (
          <div class="ob-body">
            <div class="ob-hero">
              <DiscoverIcon />
            </div>
            <h2 class="ob-title">使いたいアプリを追加しましょう</h2>
            <p class="ob-desc">
              おすすめアプリの一覧から、気になるものを Add でホーム画面に追加できます。あとからいつでも追加・削除できます。
            </p>
            <div class="browse-list ob-browse-list">
              {isLoading ? (
                <p class="subtle recommend-empty">読み込み中…</p>
              ) : sortedRecommended.length === 0 ? (
                <p class="subtle recommend-empty">
                  アプリ一覧を取得できませんでした。あとからツールバーの「Discover」タイルで追加できます。
                </p>
              ) : (
                sortedRecommended.map((site) => {
                  const added = existingUrls.has(normalizeUrlKey(site.url));
                  return (
                    <div key={site.id} class="browse-row">
                      <div class="browse-icon" aria-hidden="true">
                        <SiteIcon
                          site={site}
                          fallback={site.title.charAt(0).toUpperCase()}
                          fallbackClass="browse-icon-fallback"
                        />
                      </div>
                      <div class="browse-meta">
                        <strong>{site.title}</strong>
                        <span>{site.hostname}</span>
                      </div>
                      <button
                        type="button"
                        class={`browse-add ${added ? 'is-added' : ''}`}
                        disabled={added}
                        aria-label={added ? `${site.title} (追加済み)` : `${site.title} を追加`}
                        onClick={() => props.onAdd(site)}
                      >
                        {added ? (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Added
                          </>
                        ) : (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Add
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div class="ob-body">
            <div class="ob-hero">
              <EditIcon />
            </div>
            <h2 class="ob-title">サイトの追加と編集</h2>
            <p class="ob-desc">
              一覧にないサイトも追加できます。ツールバーの鉛筆アイコンをタップすると編集モードになります。
            </p>
            <ul class="ob-feature-list">
              <li class="ob-feature-item">
                <PlusIcon />
                <span>
                  <strong>追加</strong> — 編集モードに表示される「Add App」タイルをタップし、URLを入力するだけでサイトを追加できます。タイトルはページから自動で取得されます。
                </span>
              </li>
              <li class="ob-feature-item">
                <DragIcon />
                <span>
                  <strong>並び替え・削除</strong> — タイルをドラッグして順番を入れ替えたり、×ボタンで削除したりできます。タイルをタップすればURLやタイトルの編集もできます。
                </span>
              </li>
            </ul>
          </div>
        )}

        {step === 3 && (
          <div class="ob-body">
            <div class="ob-hero">
              <CheckIcon />
            </div>
            <h2 class="ob-title">準備完了です！</h2>
            <p class="ob-desc">
              あとはツールバーの各アイコンから、いつでも設定を変更できます。
            </p>
            <ul class="ob-feature-list">
              <li class="ob-feature-item">
                <SettingsIcon />
                <span>
                  <strong>Settings</strong> — ダークモードの切り替えや、背景画像のカスタマイズができます。
                </span>
              </li>
              <li class="ob-feature-item">
                <SyncIcon />
                <span>
                  <strong>Sync</strong> — QRコードや招待リンクを使って、他のデバイスとサイトや設定を同期できます。
                </span>
              </li>
            </ul>
          </div>
        )}

        <footer class="ob-footer">
          <div class="ob-dots" aria-hidden="true">
            {Array.from({ length: STEP_COUNT }, (_, i) => (
              <span key={i} class={`ob-dot ${i === step ? 'active' : ''}`} />
            ))}
          </div>
          <div class="ob-footer-actions">
            {step > 0 && (
              <button type="button" class="ob-back" onClick={() => setStep(step - 1)}>
                戻る
              </button>
            )}
            {step === 0 && (
              <button type="button" class="primary" onClick={() => setStep(1)}>
                はじめる
              </button>
            )}
            {step > 0 && step < 3 && (
              <button type="button" class="primary" onClick={() => setStep(step + 1)}>
                次へ
              </button>
            )}
            {step === 3 && (
              <button type="button" class="primary" onClick={props.onClose}>
                完了
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
