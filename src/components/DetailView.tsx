import type { DetectedItem } from "../types";
import { hasKoreanVoice, speak } from "../utils/speak";
import PhraseCard from "./PhraseCard";

const SPICY_LABEL = ["Not spicy", "Mild", "Medium", "Spicy", "Very spicy"] as const;

export default function DetailView({ item, onBack }: { item: DetectedItem; onBack: () => void }) {
  const { menu } = item;
  const price = item.ocrPrice ?? menu.priceTypical;
  const voiceOk = hasKoreanVoice();

  return (
    <div className="absolute inset-0 flex flex-col overflow-y-auto bg-white text-neutral-900">
      {/* Sticky back bar — explicit user requirement (§5-C) */}
      <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-neutral-200 bg-white/95 px-4 pb-3 pt-10 backdrop-blur-sm">
        <button
          onClick={onBack}
          className="rounded-full bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 active:scale-95"
        >
          ← Back to menu
        </button>
        <span className="ml-auto text-[11px] font-semibold tracking-widest text-emerald-600">
          HOW TO ORDER
        </span>
      </div>

      <div className="px-5 pb-10">
        {/* ① Food photo (16:9) — emoji placeholder when no photo is available (§7) */}
        <div className="mt-4 flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100">
          {menu.image ? (
            <img src={menu.image} alt={menu.meaning} className="h-full w-full object-cover" />
          ) : (
            <span className="text-7xl" role="img" aria-label={menu.meaning}>
              {menu.emoji}
            </span>
          )}
        </div>

        {/* ② Big hangul — show this to the vendor */}
        <h1 className="mt-5 text-[32px] font-bold leading-tight tracking-tight">{menu.hangul}</h1>

        {/* ③ Romanization + 🔊 */}
        <div className="mt-1 flex items-center gap-2">
          <p className="text-lg italic text-emerald-700">{menu.roman}</p>
          <button
            onClick={() => speak(menu.hangul)}
            disabled={!voiceOk}
            aria-label={`Play pronunciation: ${menu.hangul}`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 active:scale-90 disabled:opacity-40"
          >
            🔊
          </button>
        </div>

        {/* ④ English meaning */}
        <p className="mt-2 text-base text-neutral-700">{menu.meaning}</p>

        {/* ⑤ Tags: spicy · price · allergens */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Tag>
            {menu.spicy > 0 ? "🌶️".repeat(menu.spicy) : "🙂"} {SPICY_LABEL[menu.spicy]}
          </Tag>
          <Tag>
            💰 {price}
            {item.ocrPrice && <span className="ml-1 text-[10px] text-neutral-400">(from board)</span>}
          </Tag>
          {menu.allergens.map((a) => (
            <Tag key={a}>⚠️ {a}</Tag>
          ))}
        </div>

        {/* ⑥ Order phrases */}
        <p className="mt-6 text-[11px] font-semibold tracking-widest text-neutral-500">
          SAY THIS — OR SHOW THIS SCREEN TO THE VENDOR
        </p>
        <div className="mt-2 space-y-3">
          {menu.phrases.map((p) => (
            <PhraseCard key={p.ko} phrase={p} />
          ))}
        </div>

        {/* ⑦ One-line story */}
        <p className="mt-6 rounded-2xl bg-neutral-100 p-4 text-sm leading-relaxed text-neutral-600">
          💡 {menu.story}
        </p>
      </div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700">
      {children}
    </span>
  );
}
