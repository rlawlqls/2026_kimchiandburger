import type { ScanHistoryEntry, UserProfile } from "../types";

// localStorage keys — namespaced so they never collide with other apps on the origin.
const PROFILE_KEY = "jangbogi.profile";
const HISTORY_KEY = "jangbogi.history";
const HISTORY_CAP = 30;

export const DEFAULT_PROFILE: UserProfile = {
  name: "",
  spiceTolerance: 2,
  allergies: [],
};

/** Read the saved profile, falling back to defaults (also covers private-mode throws). */
export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : DEFAULT_PROFILE.name,
      spiceTolerance:
        typeof parsed.spiceTolerance === "number"
          ? (Math.max(0, Math.min(4, parsed.spiceTolerance)) as UserProfile["spiceTolerance"])
          : DEFAULT_PROFILE.spiceTolerance,
      allergies: Array.isArray(parsed.allergies) ? parsed.allergies : [],
    };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore — private mode / storage disabled. In-memory state still works this session.
  }
}

export function loadHistory(): ScanHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ScanHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

/**
 * Prepend an interaction to the timeline: newest first, one row per dish
 * (a re-tap moves the dish to the top with a fresh timestamp), capped.
 */
export function addHistoryEntry(
  history: ScanHistoryEntry[],
  entry: ScanHistoryEntry,
): ScanHistoryEntry[] {
  const next = [entry, ...history.filter((h) => h.menuId !== entry.menuId)].slice(0, HISTORY_CAP);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Ignore persistence failure — return the updated list regardless.
  }
  return next;
}

/** Wipe the timeline (mockup "Clear all"). */
export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // Ignore — storage disabled.
  }
}
