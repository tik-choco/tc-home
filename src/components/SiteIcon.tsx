import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { discoverPageIcon } from '../utils/iconDiscovery';
import type { Site } from '../utils/site';

type Source = {
  url: string;
  // Google's favicon service returns its 16px default globe when it has no
  // icon for the domain, even at sz=128 — a load that small counts as a miss.
  rejectTiny?: boolean;
};

function buildSources(site: Site): Source[] {
  const sources: Source[] = [];
  const seen = new Set<string>();
  const push = (url: string, rejectTiny?: boolean) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    sources.push(rejectTiny ? { url, rejectTiny } : { url });
  };

  if (site.url) {
    push(
      `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(site.url)}`,
      true,
    );
    // Apps served under a path (e.g. /vrsns/) often keep their icon next to
    // the app, not at the host root.
    try {
      push(new URL('favicon.ico', site.url).href);
    } catch {
      /* ignore malformed URLs */
    }
  }
  if (site.hostname) {
    push(`https://${site.hostname}/apple-touch-icon.png`);
    push(`https://icons.duckduckgo.com/ip3/${site.hostname}.ico`);
    push(`https://${site.hostname}/favicon.ico`);
  }
  return sources;
}

type Props = {
  site: Site;
  class?: string;
  // Optional text shown until an icon actually loads; hidden afterwards so it
  // can't show through transparent favicons.
  fallback?: string;
  fallbackClass?: string;
};

// Favicon with a fallback chain. Tries each source in order; the fallback
// text (if any) stays visible only while no image has loaded.
export function SiteIcon({ site, class: className, fallback, fallbackClass }: Props) {
  // Icon declared by the page itself (<link rel="icon">), when the site is
  // reachable cross-origin — the most authoritative source, tried first.
  const [discovered, setDiscovered] = useState<string | null>(null);

  useEffect(() => {
    setDiscovered(null);
    if (!site.url) return;
    let canceled = false;
    discoverPageIcon(site.url).then((icon) => {
      if (!canceled && icon) setDiscovered(icon);
    });
    return () => {
      canceled = true;
    };
  }, [site.url]);

  const sources = useMemo(() => {
    const list = buildSources(site);
    if (discovered) list.unshift({ url: discovered });
    return list;
  }, [site.url, site.hostname, discovered]);

  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  // A tiny-but-valid Google icon beats the letter fallback if nothing else loads.
  const tinyFallback = useRef<string | null>(null);

  useEffect(() => {
    setIndex(0);
    setLoaded(false);
    tinyFallback.current = null;
  }, [sources]);

  const source = sources[index];
  const src = source ? source.url : tinyFallback.current;

  return (
    <>
      {!loaded && fallback ? <span class={fallbackClass}>{fallback}</span> : null}
      {src ? (
        <img
          class={className}
          src={src}
          alt=""
          loading="lazy"
          onLoad={(event) => {
            const img = event.currentTarget as HTMLImageElement;
            if (source?.rejectTiny && img.naturalWidth <= 16) {
              tinyFallback.current = source.url;
              setIndex((i) => i + 1);
            } else {
              setLoaded(true);
            }
          }}
          onError={() => setIndex((i) => i + 1)}
        />
      ) : null}
    </>
  );
}
