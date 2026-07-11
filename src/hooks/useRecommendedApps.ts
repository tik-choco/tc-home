import { useEffect, useState } from 'preact/hooks';
import { type Site } from '../utils/site';

const RECOMMENDED_URL = 'https://raw.githubusercontent.com/tik-choco/tc-registry/main/apps.json';

export function useRecommendedApps() {
  const [recommended, setRecommended] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      })
      .finally(() => {
        if (!canceled) setIsLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, []);

  return { recommended, isLoading };
}
