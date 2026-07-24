// localStorage keys — namespaced so they never collide with other apps on the origin.
// The app shipped as "Jangbogi" before the Market Mate AI rename, so every key is
// resolved through a one-time move that carries the old value across. Once no live
// install can still be on a jangbogi.* build, LEGACY_PREFIX and the move can go.
const PREFIX = "marketmate.";
const LEGACY_PREFIX = "jangbogi.";

/**
 * Namespaced key for `name`, adopting any value the Jangbogi build left behind so a
 * rename never costs a user their profile or history. The legacy entry is removed on
 * the way out, which makes this a no-op on every run after the first.
 */
export function storageKey(name: string): string {
  const key = PREFIX + name;
  try {
    const legacyKey = LEGACY_PREFIX + name;
    const legacy = localStorage.getItem(legacyKey);
    if (legacy !== null) {
      // Anything already written under the new key wins — it is the newer value.
      if (localStorage.getItem(key) === null) localStorage.setItem(key, legacy);
      localStorage.removeItem(legacyKey);
    }
  } catch {
    // Private mode / storage disabled — callers already tolerate reads failing.
  }
  return key;
}
