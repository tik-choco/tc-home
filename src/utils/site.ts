export type Site = {
  id: string;
  url: string;
  title: string;
  hostname: string;
  addedAt: number;
};

export function safeHostname(input: string) {
  try {
    return new URL(input).hostname;
  } catch {
    return input.replace(/^https?:\/\//i, '').split('/')[0] || input;
  }
}

export function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// Key for "is this app already added?" comparisons: ignores protocol,
// trailing slashes, and case so trivial URL variations still match.
export function normalizeUrlKey(url: string) {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, '');
    return `${parsed.hostname}${path}${parsed.search}`.toLowerCase();
  } catch {
    return url.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '').toLowerCase();
  }
}

export function makeTitle(hostname: string) {
  return hostname.replace(/^www\./i, '').split('.')[0] || 'Site';
}

export async function fetchPageTitle(url: string, signal?: AbortSignal) {
  try {
    const res = await fetch(url, { method: 'GET', signal });
    if (!res.ok) return null;
    const text = await res.text();
    const match = text.match(/<title[^>]*>([^<]*)<\/title>/i);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}
