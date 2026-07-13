// Writes the accent color as inline styles on the root element. Inline
// styles win over every light/dark/auto theme block in the stylesheet, so
// setting them here is enough to make the custom accent apply uniformly
// across all themes without touching the CSS itself.

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const ACCENT_PROPERTIES = [
  '--accent',
  '--accent-hover',
  '--accent-active',
  '--accent-bg',
  '--accent-bg-strong',
  '--accent-border',
  '--ring',
  '--on-accent',
] as const;

function parseChannels(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function toHex(value: number): string {
  return Math.round(Math.min(255, Math.max(0, value)))
    .toString(16)
    .padStart(2, '0');
}

function shade(r: number, g: number, b: number, factor: number): string {
  return `#${toHex(r * factor)}${toHex(g * factor)}${toHex(b * factor)}`;
}

export function applyAccent(hex: string): void {
  const root = document.documentElement.style;

  if (!HEX_COLOR_RE.test(hex)) {
    for (const prop of ACCENT_PROPERTIES) {
      root.removeProperty(prop);
    }
    return;
  }

  const [r, g, b] = parseChannels(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const onAccent = luminance > 0.6 ? '#1a1d23' : '#ffffff';

  root.setProperty('--accent', hex);
  root.setProperty('--accent-hover', shade(r, g, b, 0.9));
  root.setProperty('--accent-active', shade(r, g, b, 0.82));
  root.setProperty('--accent-bg', `rgba(${r}, ${g}, ${b}, 0.12)`);
  root.setProperty('--accent-bg-strong', `rgba(${r}, ${g}, ${b}, 0.18)`);
  root.setProperty('--accent-border', `rgba(${r}, ${g}, ${b}, 0.38)`);
  root.setProperty('--ring', `rgba(${r}, ${g}, ${b}, 0.5)`);
  root.setProperty('--on-accent', onAccent);
}
