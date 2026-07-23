import type { MenuItem, Phrase } from "../types";

// Native-Korean counting numbers 1–10 used with the 개 (gae) counter for market snacks.
const KO_COUNT = ["", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];
const KO_COUNT_ROMAN = ["", "han", "du", "se", "ne", "da-seot", "yeo-seot", "il-gop", "yeo-deol", "a-hop", "yeol"];

export const MIN_QTY = 1;
export const MAX_QTY = 20;

export function clampQty(qty: number): number {
  if (!Number.isFinite(qty)) return MIN_QTY;
  return Math.max(MIN_QTY, Math.min(MAX_QTY, Math.round(qty)));
}

/** Korean number word for the 개 counter; falls back to the Sino digit past 10. */
export function koCount(qty: number): { ko: string; roman: string } {
  if (qty >= 1 && qty <= 10) return { ko: KO_COUNT[qty], roman: KO_COUNT_ROMAN[qty] };
  return { ko: String(qty), roman: String(qty) };
}

/**
 * Build a quantity-aware order phrase, e.g. qty 3 →
 *   ko:    "떡볶이 세 개 주세요"
 *   roman: "tteok-bokki se-gae ju-se-yo"
 *   en:    "Can I order 3 tteokbokki please"
 */
export function buildOrderPhrase(menu: MenuItem, qty: number): Phrase {
  const n = clampQty(qty);
  const { ko, roman } = koCount(n);
  return {
    ko: `${menu.hangul} ${ko} 개 주세요`,
    roman: `${menu.roman} ${roman}-gae ju-se-yo`,
    en: `Can I order ${n} ${menu.roman} please`,
  };
}
