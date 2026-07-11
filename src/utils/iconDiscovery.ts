// Browser-style favicon discovery: fetch the page HTML and read its
// <link rel="icon"> declarations, like the bookmark manager does. Only works
// where the site is same-origin or sends CORS headers, so results (including
// failures) are cached in localStorage to avoid refetching on every new tab.

const CACHE_KEY = 'tc-home-icon-discovery';
const HIT_TTL = 7 * 24 * 60 * 60 * 1000;
const MISS_TTL = 24 * 60 * 60 * 1000;

type CacheEntry = { icon: string | null; at: number };

function loadCache(): Record<string, CacheEntry> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Record<string, CacheEntry>;
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, CacheEntry>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* storage full — discovery just reruns next time */
  }
}

function parseIconLinks(html: string, baseUrl: string): string | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const links = doc.querySelectorAll<HTMLLinkElement>(
    'link[rel~="icon" i], link[rel~="apple-touch-icon" i]',
  );

  let best: { url: string; size: number } | null = null;
  for (const link of Array.from(links)) {
    const href = link.getAttribute('href');
    if (!href) continue;
    const rel = (link.getAttribute('rel') ?? '').toLowerCase();
    const sizes = link.getAttribute('sizes') ?? '';
    const size =
      sizes === 'any'
        ? 512
        : parseInt(sizes, 10) || (rel.includes('apple-touch-icon') ? 180 : 32);
    try {
      // DOMParser resolves relative hrefs against this page, not the fetched
      // one, so resolve manually against the page URL.
      const abs = new URL(href, baseUrl).href;
      if (!best || size > best.size) best = { url: abs, size };
    } catch {
      /* skip malformed href */
    }
  }
  return best ? best.url : null;
}

export async function discoverPageIcon(pageUrl: string): Promise<string | null> {
  const cache = loadCache();
  const hit = cache[pageUrl];
  if (hit && Date.now() - hit.at < (hit.icon ? HIT_TTL : MISS_TTL)) {
    return hit.icon;
  }

  let icon: string | null = null;
  try {
    const res = await fetch(pageUrl);
    if (res.ok) {
      icon = parseIconLinks(await res.text(), res.url || pageUrl);
    }
  } catch {
    /* CORS-blocked or offline — nothing to discover */
  }

  cache[pageUrl] = { icon, at: Date.now() };
  saveCache(cache);
  return icon;
}
