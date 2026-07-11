import { useEffect, useState } from 'preact/hooks';

export type UseAutoTitleParams = {
  url: string;
  isEnabled: boolean;
  titleInput: string;
  onTitle: (value: string) => void;
  onMessage: (message: string) => void;
};

export function useAutoTitle({ url, isEnabled, titleInput, onTitle, onMessage }: UseAutoTitleParams) {
  const [isFetching, setIsFetching] = useState(false);
  const [lastFetchedUrl, setLastFetchedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isEnabled) {
      setLastFetchedUrl(null);
      return;
    }

    if (!url.trim()) return;
    if (titleInput.trim()) return;
    if (url === lastFetchedUrl) return;

    let canceled = false;
    const controller = new AbortController();

    setIsFetching(true);
    onMessage('タイトルを取得しています...');

    fetch(url, { method: 'GET', signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('bad response');
        return res.text();
      })
      .then((text) => {
        if (canceled) return;
        const match = text.match(/<title[^>]*>([^<]*)<\/title>/i);
        const title = match ? match[1].trim() : null;
        setLastFetchedUrl(url);
        if (title) {
          onTitle(title);
          onMessage('タイトルを自動入力しました。');
        } else {
          onMessage('タイトルの取得に失敗しました。');
        }
      })
      .catch(() => {
        if (canceled) return;
        setLastFetchedUrl(url);
        onMessage('タイトルの取得に失敗しました。');
      })
      .finally(() => {
        if (canceled) return;
        setIsFetching(false);
      });

    return () => {
      canceled = true;
      controller.abort();
    };
  }, [url, isEnabled, titleInput, lastFetchedUrl, onMessage, onTitle]);

  return { isFetching };
}
