import type { DetectedItem, OcrToken } from "../types";

interface Props {
  image: string;
  detected: DetectedItem[];
  rawTokens: OcrToken[];
  engine: "vision" | "tesseract" | null;
  onSelect: (item: DetectedItem) => void;
  onRescan: () => void;
}

// Highlight visual language: amber "link" boxes over the photo (§5-B).
const HIGHLIGHT_BG = "rgba(245,185,66,0.25)";
const HIGHLIGHT_BORDER = "#f5b942";

export default function BoardView({ image, detected, rawTokens, engine, onSelect, onRescan }: Props) {
  return (
    <div className="absolute inset-0 flex flex-col bg-neutral-950">
      {/* Top bar */}
      <div className="z-20 flex items-center justify-between px-4 pb-3 pt-10">
        <button
          onClick={onRescan}
          className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm active:scale-95"
        >
          ← Scan another
        </button>
        {engine === "tesseract" && (
          <span className="rounded-full bg-amber-500/20 px-2 py-1 text-[10px] font-medium text-amber-300">
            offline OCR
          </span>
        )}
      </div>

      {/* Board photo + tappable overlays */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative w-full">
          <img src={image} alt="Scanned menu board" className="block w-full" />
          {detected.map((item, i) => {
            const [x, y, w, h] = item.bbox;
            return (
              <button
                key={item.menu.id}
                onClick={() => onSelect(item)}
                aria-label={`${item.menu.hangul} — ${item.menu.meaning}`}
                className="highlight-in absolute rounded-sm"
                style={{
                  left: `${x * 100}%`,
                  top: `calc(${y * 100}% - 6px)`, // +6px vertical padding → ≥44px touch target
                  width: `${w * 100}%`,
                  height: `calc(${h * 100}% + 12px)`,
                  backgroundColor: HIGHLIGHT_BG,
                  borderBottom: `2px solid ${HIGHLIGHT_BORDER}`,
                  animationDelay: `${Math.min(i * 0.5, 4)}s`,
                }}
              />
            );
          })}
        </div>

        {/* Zero-match fallback (§5-B) */}
        {detected.length === 0 && (
          <div className="mx-4 mt-6 rounded-2xl bg-white/10 p-4 text-center backdrop-blur-sm">
            <p className="text-sm font-semibold text-white">No menu items recognized</p>
            <p className="mt-1 text-xs text-white/70">
              Try a straight-on, well-lit photo of a bunsik (snack bar) menu.
            </p>
            {rawTokens.length > 0 && (
              <p className="mt-3 break-keep text-[11px] leading-relaxed text-white/50">
                Text found: {rawTokens.slice(0, 20).map((t) => t.text).join(" · ")}
              </p>
            )}
            <button
              onClick={onRescan}
              className="mt-4 rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold text-white active:scale-95"
            >
              Scan again
            </button>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="z-20 bg-gradient-to-t from-black via-black/90 to-transparent px-5 pb-6 pt-4 text-center">
        <p className="text-sm font-medium text-white">
          {detected.length > 0
            ? `${detected.length} item${detected.length > 1 ? "s" : ""} recognized — tap one to learn how to order`
            : "Nothing to tap yet"}
        </p>
      </div>
    </div>
  );
}
