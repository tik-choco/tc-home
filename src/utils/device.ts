const DEVICE_STORAGE_KEY = 'tc-home-device-id';

export function readDeviceId() {
  try {
    const stored = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (stored) return stored;
  } catch {
    // Storage unavailable — fall through to a fresh id for this session.
  }

  const next = crypto.randomUUID();
  try {
    localStorage.setItem(DEVICE_STORAGE_KEY, next);
  } catch {
    // Non-fatal; the id just won't persist across reloads/other tabs.
  }
  return next;
}
