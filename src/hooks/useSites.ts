import { useEffect, useMemo, useState } from 'preact/hooks';
import { defaultSites, Site } from '../utils/site';

const STORAGE_KEY = 'tc-home-sites';

export function useSites() {
  const [sites, setSites] = useState<Site[]>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSites;

    try {
      const parsed = JSON.parse(raw) as Site[];
      return parsed.length ? parsed : defaultSites;
    } catch {
      return defaultSites;
    }
  });


  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
  }, [sites]);

  const addSite = (site: Site) => {
    setSites((current) => [site, ...current]);
  };

  const updateSite = (id: string, partial: Partial<Site>) => {
    setSites((current) =>
      current.map((site) => (site.id === id ? { ...site, ...partial } : site)),
    );
  };

  const removeSite = (id: string) => {
    setSites((current) => current.filter((site) => site.id !== id));
  };

  const reorderSites = (fromId: string, toId: string) => {
    if (fromId === toId) return;

    setSites((prev) => {
      const fromIndex = prev.findIndex((s) => s.id === fromId);
      const toIndex = prev.findIndex((s) => s.id === toId);
      if (fromIndex === -1 || toIndex === -1) return prev;

      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  return {
    sites,
    addSite,
    updateSite,
    removeSite,
    reorderSites,
  };
}
