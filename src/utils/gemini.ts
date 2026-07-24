import { allergenInfo } from "../data/allergens";
import type { Allergen, MenuItem, SpiceLevel } from "../types";

export interface SuggestedPhrase {
  ko: string;
  roman: string;
  en: string;
  intent: string;
}

export interface SuggestContext {
  dish: Pick<MenuItem, "hangul" | "roman" | "meaning" | "spicy" | "allergens">;
  qty: number;
  spiceTolerance: SpiceLevel;
  allergies: Allergen[];
}

export interface SuggestResult {
  phrases: SuggestedPhrase[];
  /** true when phrases came live from Gemini; false when the static fallback was used. */
  ai: boolean;
}

/**
 * Ask Gemini (via /api/gemini) for vendor questions personalized to the dish +
 * profile. Degrades gracefully: on 503 (no key) or any error, returns a curated
 * static set so the UI always has helpful suggestions.
 */
export async function suggestPhrases(ctx: SuggestContext): Promise<SuggestResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context: ctx }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`/api/gemini responded ${res.status}`);
    const data = (await res.json()) as { phrases?: SuggestedPhrase[] };
    if (!Array.isArray(data.phrases) || data.phrases.length === 0) {
      throw new Error("Empty Gemini response");
    }
    return { phrases: data.phrases, ai: true };
  } catch (err) {
    console.warn("Gemini unavailable, using static suggestions:", err);
    return { phrases: fallbackPhrases(ctx), ai: false };
  } finally {
    clearTimeout(timer);
  }
}

/** Deterministic vendor-question set built from the dish + profile — no network. */
export function fallbackPhrases(ctx: SuggestContext): SuggestedPhrase[] {
  const { dish, qty, spiceTolerance, allergies } = ctx;
  const out: SuggestedPhrase[] = [
    { ko: "이거 얼마예요?", roman: "i-geo eol-ma-ye-yo?", en: "How much is this?", intent: "price" },
    {
      ko: `${dish.hangul} 있어요?`,
      roman: `${dish.roman} it-sseo-yo?`,
      en: `Do you have ${dish.roman}?`,
      intent: "availability",
    },
    { ko: "이거 매워요?", roman: "i-geo mae-wo-yo?", en: "Is this spicy?", intent: "spice" },
  ];

  if (dish.spicy > spiceTolerance) {
    out.push({
      ko: "덜 맵게 해 주세요",
      roman: "deol maep-ge hae ju-se-yo",
      en: "Less spicy, please",
      intent: "spice",
    });
  }

  const flagged = dish.allergens.filter((a) => allergies.includes(a));
  if (flagged.length > 0) {
    const a = allergenInfo(flagged[0]);
    out.push({
      ko: `${a.ko} 들어가요?`,
      roman: `${a.roman} deu-reo-ga-yo?`,
      en: `Does it contain ${a.word}?`,
      intent: "allergen",
    });
  }

  out.push({
    ko: "카드 돼요?",
    roman: "ka-deu dwae-yo?",
    en: "Can I pay by card?",
    intent: "payment",
  });

  if (qty > 1) {
    out.push({
      ko: `${qty}개 주세요`,
      roman: `${qty}-gae ju-se-yo`,
      en: `${qty} please`,
      intent: "quantity",
    });
  }

  return out.slice(0, 6);
}
