import type { Allergen, MenuItem, Phrase, UserProfile } from "../types";
import { clampQty, koCount } from "./orderPhrase";

/** Category shown on each card + the tint it uses. */
export type PhraseTone = "allergy" | "spice" | "common";

export interface OtherPhrase extends Phrase {
  /** Small label above the sentence, e.g. "ALLERGY · 알레르기". */
  tag: string;
  tone: PhraseTone;
}

/** Korean name / romanization / English word for each allergen we track. */
const ALLERGEN_KO: Record<Allergen, { ko: string; roman: string; en: string }> = {
  gluten: { ko: "밀", roman: "mil", en: "wheat" },
  seafood: { ko: "해산물", roman: "hae-san-mul", en: "seafood" },
  egg: { ko: "계란", roman: "gye-ran", en: "egg" },
  dairy: { ko: "우유", roman: "u-yu", en: "dairy" },
  soy: { ko: "콩", roman: "kong", en: "soy" },
  nuts: { ko: "견과류", roman: "gyeon-gwa-ryu", en: "nuts" },
};

const TAG: Record<"allergy" | "spice" | "price" | "takeout" | "reorder", string> = {
  allergy: "ALLERGY · 알레르기",
  spice: "SPICE · 맵기",
  price: "PRICE · 가격",
  takeout: "TAKEOUT · 포장",
  reorder: "REORDER · 재주문",
};

/**
 * Pick 3 situational sentences for this dish, tailored to the profile and menu.
 * Priority: allergy > spice > common (price · takeout · reorder). The dish name
 * and quantity are injected automatically where they apply.
 */
export function otherPhrases(menu: MenuItem, profile: UserProfile, qty: number): OtherPhrase[] {
  const flagged = menu.allergens.filter((a) => profile.allergies.includes(a));
  const spiceDiff = menu.spicy - profile.spiceTolerance;
  const out: OtherPhrase[] = [];

  // 1) Allergy — only when this dish contains one of the user's allergens.
  if (flagged.length > 0) {
    const a = ALLERGEN_KO[flagged[0]];
    out.push({
      tag: TAG.allergy,
      tone: "allergy",
      ko: `여기 ${a.ko} 들어가요?`,
      roman: `yeo-gi ${a.roman} deu-reo-ga-yo?`,
      en: `Does this contain ${a.en}?`,
    });
    out.push({
      tag: TAG.allergy,
      tone: "allergy",
      ko: `${a.ko} 빼고 주세요`,
      roman: `${a.roman} ppae-go ju-se-yo`,
      en: `Without ${a.en}, please`,
    });
  }

  // 2) Spice — only for spicy dishes. Hotter than my limit → milder; otherwise plain.
  if (menu.spicy > 0) {
    out.push(
      spiceDiff >= 1
        ? {
            tag: TAG.spice,
            tone: "spice",
            ko: "덜 맵게 해주세요",
            roman: "deol maep-ge hae-ju-se-yo",
            en: "Less spicy, please",
          }
        : {
            tag: TAG.spice,
            tone: "spice",
            ko: "안 맵게 해주세요",
            roman: "an maep-ge hae-ju-se-yo",
            en: "Not spicy, please",
          }
    );
  }

  // 3) Common — price · takeout · reorder (dish name + quantity injected).
  const n = clampQty(qty);
  const count = koCount(n);
  out.push({
    tag: TAG.price,
    tone: "common",
    ko: `${menu.hangul} 얼마예요?`,
    roman: `${menu.roman} eol-ma-ye-yo?`,
    en: `How much is the ${menu.roman}?`,
  });
  out.push({
    tag: TAG.takeout,
    tone: "common",
    ko: "포장해 주세요",
    roman: "po-jang-hae ju-se-yo",
    en: "To go, please",
  });
  out.push({
    tag: TAG.reorder,
    tone: "common",
    ko: `${menu.hangul} ${count.ko} 개 더 주세요`,
    roman: `${menu.roman} ${count.roman}-gae deo ju-se-yo`,
    en: `${n} more ${menu.roman}, please`,
  });

  return out.slice(0, 3);
}
