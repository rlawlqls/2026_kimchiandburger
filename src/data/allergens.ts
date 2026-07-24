import type { Allergen } from "../types";

export interface AllergenInfo {
  id: Allergen;
  /** Label shown on the profile chip and in alert banners. */
  en: string;
  /** Lowercase noun for mid-sentence use, e.g. "Does this contain wheat?". */
  word: string;
  /** Korean word used when asking the vendor "does it contain …?". */
  ko: string;
  /** Korean shown on the profile chip when it differs from the spoken word. */
  koLabel?: string;
  roman: string;
  /** Lowercase substrings matched against `MenuItem.ingredients` for highlighting. */
  keywords: string[];
}

/** The 12 allergens we track — order matches the profile grid. */
export const ALLERGENS: AllergenInfo[] = [
  { id: "peanut", en: "Peanut", word: "peanut", ko: "땅콩", roman: "ttang-kong", keywords: ["peanut"] },
  { id: "treenut", en: "Tree nuts", word: "tree nuts", ko: "견과류", roman: "gyeon-gwa-ryu", keywords: ["nut", "walnut", "almond", "pine nut"] },
  { id: "shellfish", en: "Shellfish", word: "shellfish", ko: "갑각류", roman: "gap-gak-ryu", keywords: ["shrimp", "crab", "prawn"] },
  { id: "mollusk", en: "Mollusks", word: "shellfish (mollusks)", ko: "조개류", roman: "jo-gae-ryu", keywords: ["squid", "clam", "oyster", "octopus", "mussel"] },
  { id: "milk", en: "Milk", word: "milk", ko: "우유", roman: "u-yu", keywords: ["milk", "cheese", "butter", "cream", "mozzarella", "cheddar"] },
  { id: "egg", en: "Egg", word: "egg", ko: "계란", roman: "gye-ran", keywords: ["egg", "mayonnaise"] },
  { id: "wheat", en: "Wheat / Gluten", word: "wheat", ko: "밀", koLabel: "밀/글루텐", roman: "mil", keywords: ["wheat", "flour", "noodle", "bread", "breadcrumb", "wrapper", "batter", "udon", "ramen", "somyeon"] },
  { id: "soy", en: "Soy", word: "soy", ko: "대두", roman: "dae-du", keywords: ["soy", "tofu", "gochujang", "doenjang"] },
  { id: "sesame", en: "Sesame", word: "sesame", ko: "참깨", roman: "cham-kkae", keywords: ["sesame", "perilla"] },
  { id: "buckwheat", en: "Buckwheat", word: "buckwheat", ko: "메밀", roman: "me-mil", keywords: ["buckwheat", "memil"] },
  { id: "fish", en: "Fish", word: "fish", ko: "생선", roman: "saeng-seon", keywords: ["fish", "anchovy", "tuna", "bonito", "eomuk"] },
  { id: "pork", en: "Pork", word: "pork", ko: "돼지고기", roman: "dwae-ji-go-gi", keywords: ["pork", "ham", "pig", "sundae", "bacon", "sausage"] },
];

const BY_ID = new Map<Allergen, AllergenInfo>(ALLERGENS.map((a) => [a.id, a]));

export const allergenInfo = (a: Allergen): AllergenInfo =>
  BY_ID.get(a) ?? { id: a, en: a, word: a, ko: a, roman: a, keywords: [a] };

export const allergenEn = (a: Allergen): string => allergenInfo(a).en;
export const allergenKo = (a: Allergen): string => allergenInfo(a).ko;
export const allergenRoman = (a: Allergen): string => allergenInfo(a).roman;

export const isAllergen = (v: unknown): v is Allergen =>
  typeof v === "string" && BY_ID.has(v as Allergen);

/**
 * Allergen ids used before the list grew from 6 to 12. Profiles saved by the old
 * build still hold these, so `loadProfile` rewrites them on read. "seafood" was
 * one bucket for three of the new ids — expand it rather than guess.
 */
export const LEGACY_ALLERGEN_IDS: Record<string, Allergen[]> = {
  gluten: ["wheat"],
  dairy: ["milk"],
  nuts: ["treenut"],
  seafood: ["fish", "shellfish", "mollusk"],
};

/** Does this ingredient string look like the given allergen? Drives the red chips. */
export const ingredientMatches = (ingredient: string, a: Allergen): boolean => {
  const lower = ingredient.toLowerCase();
  return allergenInfo(a).keywords.some((k) => lower.includes(k));
};
