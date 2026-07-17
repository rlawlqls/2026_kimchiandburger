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
  emoji: string;
  image: string | null;
  story: string;
  phrases: Phrase[];
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
