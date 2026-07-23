import { useCallback, useState } from "react";
import type { ScanHistoryEntry, UserProfile } from "../types";
import {
  addHistoryEntry,
  clearHistory as clearHistoryStore,
  loadHistory,
  loadProfile,
  saveProfile,
} from "../utils/profile";

/**
 * Single source of truth for profile + scan history, backed by localStorage.
 * Lifted into App and passed down — matches the app's useState-only architecture.
 */
export function useProfile() {
  const [profile, setProfileState] = useState<UserProfile>(() => loadProfile());
  const [history, setHistory] = useState<ScanHistoryEntry[]>(() => loadHistory());

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setProfileState((prev) => {
      const next = { ...prev, ...patch };
      saveProfile(next);
      return next;
    });
  }, []);

  const recordScan = useCallback((entry: ScanHistoryEntry) => {
    setHistory((prev) => addHistoryEntry(prev, entry));
  }, []);

  const clearHistory = useCallback(() => {
    clearHistoryStore();
    setHistory([]);
  }, []);

  return { profile, updateProfile, history, recordScan, clearHistory };
}
