// First-run onboarding state — a single "completed" flag in localStorage plus
// a tiny same-tab request channel so the settings screen can ask the app
// shell to re-open the wizard.

const DONE_KEY = 'tc-home-onboarding-done';
// Set when the wizard is first shown. useSites persists 'tc-home-sites' on
// mount, so without this a reload mid-tour would look like an existing
// install and the wizard would never come back.
const PENDING_KEY = 'tc-home-onboarding-pending';

export function isOnboardingDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === '1';
  } catch {
    // Storage unavailable — treat as done so the wizard can't loop forever.
    return true;
  }
}

export function markOnboardingDone(): void {
  try {
    localStorage.setItem(DONE_KEY, '1');
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // Non-fatal; worst case the wizard shows again next launch.
  }
}

/**
 * Whether the wizard should open on launch: only on a genuinely fresh
 * install. An existing install (sites already present but no flag — i.e. a
 * user from before onboarding shipped) is marked done silently so they're
 * never interrupted.
 */
export function shouldShowOnboarding(): boolean {
  try {
    if (isOnboardingDone()) return false;
    if (localStorage.getItem(PENDING_KEY) === '1') return true;
    if (localStorage.getItem('tc-home-sites') !== null) {
      markOnboardingDone();
      return false;
    }
    localStorage.setItem(PENDING_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

// --- Re-open requests (settings screen -> app shell) ------------------------

const listeners = new Set<() => void>();

/** App shell subscribes once; returns an unsubscribe fn. */
export function subscribeOnboardingRequests(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Asks the app shell to open the onboarding wizard (e.g. from settings). */
export function requestOnboarding(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      console.warn('onboarding: listener threw', error);
    }
  }
}
