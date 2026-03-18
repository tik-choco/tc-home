export type Site = {
  id: string;
  url: string;
  title: string;
  hostname: string;
  addedAt: number;
};

export const defaultSites: Site[] = [
  {
    id: crypto.randomUUID(),
    url: 'https://gdm.tik-choco.com/vrsns/',
    title: 'VRSNS',
    hostname: 'gdm.tik-choco.com',
    addedAt: Date.now(),
  },
  {
    id: crypto.randomUUID(),
    url: 'https://github.com/tik-choco-lab/mistlib',
    title: 'Development',
    hostname: 'github.com',
    addedAt: Date.now(),
  },
];

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
