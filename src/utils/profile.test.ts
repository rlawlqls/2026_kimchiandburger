import { describe, expect, it } from "vitest";
import { addHistoryEntry } from "./profile";
import { timeAgo } from "./time";
import type { ScanHistoryEntry } from "../types";

const mk = (id: string, ts: number): ScanHistoryEntry => ({
  menuId: id,
  hangul: id,
  roman: id,
  en: id,
  emoji: "🍢",
  action: "Viewed",
  timestamp: ts,
});

describe("addHistoryEntry", () => {
  it("prepends newest first", () => {
    const next = addHistoryEntry([mk("a", 1)], mk("b", 2));
    expect(next.map((h) => h.menuId)).toEqual(["b", "a"]);
  });

  it("dedupes by menuId, moving a re-tap to the top with a fresh timestamp", () => {
    const start = [mk("a", 1), mk("b", 2)];
    const next = addHistoryEntry(start, mk("a", 99));
    expect(next.map((h) => h.menuId)).toEqual(["a", "b"]);
    expect(next[0].timestamp).toBe(99);
  });

  it("caps the list length", () => {
    let list: ScanHistoryEntry[] = [];
    for (let i = 0; i < 40; i++) list = addHistoryEntry(list, mk(`item-${i}`, i));
    expect(list.length).toBe(30);
  });
});

describe("timeAgo", () => {
  const now = 1_000_000_000_000;
  it("labels recent times", () => {
    expect(timeAgo(now, now)).toBe("just now");
    expect(timeAgo(now - 3 * 60_000, now)).toBe("3 min ago");
    expect(timeAgo(now - 2 * 3_600_000, now)).toBe("2 h ago");
    expect(timeAgo(now - 24 * 3_600_000, now)).toBe("yesterday");
    expect(timeAgo(now - 3 * 86_400_000, now)).toBe("3 d ago");
  });
});
