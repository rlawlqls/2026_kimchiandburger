import { MENU_DB } from "../data/menuDb";
import type { MenuItem } from "../types";

/** Strip everything that is not Hangul so "치즈떡볶이 2,500원" → "치즈떡볶이". */
export function extractHangul(text: string): string {
  // drop the currency suffix "원" when it follows a digit ("2,500원")
  return text.replace(/(\d)\s*원/g, "$1").replace(/[^가-힣]/g, "");
}

/** Plain Levenshtein distance — dictionary is tiny (40 items), no library needed. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[n];
}

/**
 * Match one OCR token against the menu dictionary.
 * 1) exact match on hangul/aliases
 * 2) containment: token contains a dictionary name ("치즈떡볶이2500" → 치즈떡볶이)
 * 3) Levenshtein ≤ 1 ("떡뽁이" → "떡볶이"); words of ≤2 chars require exact match
 * Returns null when nothing matches (prices, shop names… are filtered out here).
 */
export function matchMenu(ocrText: string, db: MenuItem[] = MENU_DB): MenuItem | null {
  const text = extractHangul(ocrText);
  if (text.length < 2) return null;

  // 1) exact
  for (const item of db) {
    if (item.hangul === text || item.aliases.includes(text)) return item;
  }

  // 2) containment — prefer the longest dictionary name so
  //    "치즈떡볶이" resolves to cheese-tteokbokki, not tteokbokki.
  let contained: MenuItem | null = null;
  let containedLen = 0;
  for (const item of db) {
    for (const name of [item.hangul, ...item.aliases]) {
      const clean = extractHangul(name);
      if (clean.length >= 2 && clean.length > containedLen && text.includes(clean)) {
        contained = item;
        containedLen = clean.length;
      }
    }
  }
  if (contained) return contained;

  // 3) fuzzy (edit distance ≤ 1), only for words of 3+ chars
  if (text.length >= 3) {
    for (const item of db) {
      for (const name of [item.hangul, ...item.aliases]) {
        const clean = extractHangul(name);
        if (clean.length >= 3 && levenshtein(text, clean) <= 1) return item;
      }
    }
  }

  return null;
}
