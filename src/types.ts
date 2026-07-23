export type Bbox = [number, number, number, number]; // x, y, w, h

export interface OcrToken {
  text: string;
  bbox: Bbox; // pixels
}

export interface OcrResult {
  tokens: OcrToken[];
  engine: "vision" | "tesseract";
  imageWidth: number;
  imageHeight: number;
}

export interface Phrase {
  ko: string;
  roman: string;
  en: string;
}

export type Allergen = "gluten" | "seafood" | "egg" | "dairy" | "soy" | "nuts";

export interface MenuItem {
  id: string;
  hangul: string;
  aliases: string[];
  roman: string;
  meaning: string;
  priceTypical: string;
  spicy: 0 | 1 | 2 | 3 | 4;
  allergens: Allergen[];
  /** Human-readable full ingredient list shown on the detail panel. */
  ingredients: string[];
  emoji: string;
  image: string | null;
  story: string;
  phrases: Phrase[];
}

export type SpiceLevel = 0 | 1 | 2 | 3 | 4;

/** Persisted user profile — name shown at top, plus ordering personalization. */
export interface UserProfile {
  name: string;
  spiceTolerance: SpiceLevel;
  allergies: Allergen[];
}

/** One entry in the local timeline — written only when the user opens a detail. */
export interface ScanHistoryEntry {
  menuId: string;
  hangul: string;
  roman: string;
  emoji: string;
  timestamp: number; // Date.now() at the moment the detail panel opened
}

export interface DetectedItem {
  menu: MenuItem;
  /** normalized 0~1 coordinates relative to the scanned image */
  bbox: Bbox;
  /** price read from the board next to this item, e.g. "₩3,000" (null → use priceTypical) */
  ocrPrice: string | null;
  /** raw OCR text that matched */
  sourceText: string;
}
