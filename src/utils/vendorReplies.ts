import type { Allergen, MenuItem, SpiceLevel } from "../types";

// Rule-based vendor conversation, ported from the golmokmal-en mockup. The vendor
// speaks (mic or a quick button); we match keywords and suggest what to say back,
// personalised with the current dish, quantity and the user's spice/allergen profile.

export interface VendorReply {
  ko: string;
  en: string;
  /** why we picked this reply — shown under the suggestion bubble */
  note: string;
}

export interface ReplyContext {
  menu: MenuItem | null;
  qty: number;
  spiceTolerance: SpiceLevel;
  allergies: Allergen[];
}

// Korean word for each allergen, used when rewriting "does it contain …?".
const ALLERGEN_KO: Record<Allergen, string> = {
  gluten: "밀가루",
  seafood: "해산물",
  egg: "계란",
  dairy: "유제품",
  soy: "대두",
  nuts: "견과류",
};

// Vendor questions offered as quick buttons (Korean + English gloss).
export const VENDOR_QUESTIONS: { ko: string; en: string }[] = [
  { ko: "몇 개 드려요?", en: "How many?" },
  { ko: "매운 거 괜찮아요?", en: "Is spicy OK?" },
  { ko: "포장이요?", en: "To go?" },
  { ko: "여기서 드세요?", en: "Eat here?" },
  { ko: "현금 있어요?", en: "Cash?" },
];

const RULES: { keys: string[]; reply: (ctx: ReplyContext) => VendorReply }[] = [
  {
    keys: ["몇 개", "몇개", "얼마나 드", "몇 인분"],
    reply: ({ menu, qty }) => ({
      ko: `${menu ? menu.hangul + " " : ""}${qty}개 주세요`,
      en: `${qty}, please`,
      note: "They are asking how many",
    }),
  },
  {
    keys: ["매", "맵", "맵기"],
    reply: ({ spiceTolerance }) => ({
      ko: spiceTolerance <= 2 ? "덜 맵게 해주세요" : "맵게 해주세요",
      en: spiceTolerance <= 2 ? "Less spicy, please" : "Extra spicy, please",
      note: `Matched to your spice limit ${spiceTolerance}`,
    }),
  },
  {
    keys: ["포장", "싸", "가져"],
    reply: () => ({ ko: "포장해 주세요", en: "To go, please", note: "They are asking takeout or not" }),
  },
  {
    keys: ["여기서", "드시고", "먹고 가"],
    reply: () => ({ ko: "여기서 먹을게요", en: "I'll eat here", note: "They are asking if you eat here" }),
  },
  {
    keys: ["현금", "카드", "계산", "결제"],
    reply: () => ({ ko: "카드 되나요?", en: "Do you take card?", note: "This is about payment" }),
  },
  {
    keys: ["얼마", "가격", "값"],
    reply: () => ({ ko: "얼마예요?", en: "How much is it?", note: "This is about the price" }),
  },
  {
    keys: ["알레르기", "땅콩", "견과", "들어가"],
    reply: ({ allergies }) => {
      const a = allergies[0];
      const ko = a ? ALLERGEN_KO[a] : "견과류";
      const en = a ?? "nuts";
      return { ko: `${ko} 들어가나요?`, en: `Does it contain ${en}?`, note: "Rewritten with your allergen" };
    },
  },
];

/** Suggest a reply to whatever the vendor said. Falls back to "say it again". */
export function suggestReply(text: string, ctx: ReplyContext): VendorReply {
  const hit = RULES.find((r) => r.keys.some((k) => text.includes(k)));
  if (hit) return hit.reply(ctx);
  return {
    ko: "천천히 다시 말씀해 주세요",
    en: "Could you say that again slowly?",
    note: "Not understood — ask them to repeat",
  };
}
