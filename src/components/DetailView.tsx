import { useEffect, useMemo, useState } from "react";
import type { DetectedItem, UserProfile } from "../types";
import { hasKoreanVoice, speak } from "../utils/speak";
import { buildOrderPhrase, clampQty, MAX_QTY, MIN_QTY } from "../utils/orderPhrase";
import { suggestPhrases, type SuggestedPhrase } from "../utils/gemini";

const SPICY_LABEL = ["Not spicy", "Mild", "Medium", "Spicy", "Very spicy"] as const;

export default function DetailView({
  item,
  profile,
  onBack,
}: {
  item: DetectedItem;
  profile: UserProfile;
  onBack: () => void;
}) {
  const { menu } = item;
  const price = item.ocrPrice ?? menu.priceTypical;
  const voiceOk = hasKoreanVoice();

  const [qty, setQty] = useState(1);
  const orderPhrase = useMemo(() => buildOrderPhrase(menu, qty), [menu, qty]);

  // Allergens the user flagged that this dish contains.
  const flagged = menu.allergens.filter((a) => profile.allergies.includes(a));
  const tooSpicy = menu.spicy > profile.spiceTolerance;

  // Gemini vendor-question suggestions (fetched once per dish; falls back offline).
  const [suggestions, setSuggestions] = useState<SuggestedPhrase[]>([]);
  const [aiBadge, setAiBadge] = useState(false);

  useEffect(() => {
    let live = true;
    setSuggestions([]);
    suggestPhrases({
      dish: {
        hangul: menu.hangul,
        roman: menu.roman,
        meaning: menu.meaning,
        spicy: menu.spicy,
        allergens: menu.allergens,
      },
      qty,
      spiceTolerance: profile.spiceTolerance,
      allergies: profile.allergies,
    }).then((res) => {
      if (!live) return;
      setSuggestions(res.phrases.slice(0, 3));
      setAiBadge(res.ai);
    });
    return () => {
      live = false;
    };
    // Refetch when the dish or profile changes — not on every qty tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu.id, profile.spiceTolerance, profile.allergies.join(",")]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white text-neutral-900">
      {/* Back bar */}
      <div className="z-20 flex shrink-0 items-center gap-2 border-b border-neutral-200 bg-white px-4 pb-2 pt-9">
        <button
          onClick={onBack}
          className="rounded-full bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-700 active:scale-95"
        >
          ← Menu
        </button>
        <span className="ml-auto text-[11px] font-semibold tracking-widest text-emerald-600">
          HOW TO ORDER
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 px-4 pt-3">
        {/* Header: photo + name */}
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-amber-50 to-orange-100">
            {menu.image ? (
              <img src={menu.image} alt={menu.meaning} className="h-full w-full object-cover" />
            ) : (
              <span className="text-4xl" role="img" aria-label={menu.meaning}>
                {menu.emoji}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold leading-tight">{menu.hangul}</h1>
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm italic text-emerald-700">{menu.roman}</p>
              <button
                onClick={() => speak(menu.hangul)}
                disabled={!voiceOk}
                aria-label={`Play pronunciation: ${menu.hangul}`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700 active:scale-90 disabled:opacity-40"
              >
                🔊
              </button>
            </div>
            <p className="truncate text-xs text-neutral-500">{menu.meaning}</p>
          </div>
        </div>

        {/* Tags: spice · price */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          <Tag>
            {menu.spicy > 0 ? "🌶️".repeat(menu.spicy) : "🙂"} {SPICY_LABEL[menu.spicy]}
          </Tag>
          <Tag>💰 {price}</Tag>
        </div>

        {/* Ingredients */}
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-neutral-400">INGREDIENTS</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {menu.ingredients.map((ing) => {
              const isAllergen = flagged.some((a) => ing.toLowerCase().includes(a));
              return (
                <span
                  key={ing}
                  className={`rounded-md px-1.5 py-0.5 text-[11px] ${
                    isAllergen ? "bg-red-100 text-red-700" : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {ing}
                </span>
              );
            })}
          </div>
        </div>

        {/* Personalized warnings */}
        {(flagged.length > 0 || tooSpicy) && (
          <div className="space-y-1">
            {flagged.length > 0 && (
              <p className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-700">
                ⚠️ Contains {flagged.join(", ")} — you flagged {flagged.length > 1 ? "these" : "this"}.
              </p>
            )}
            {tooSpicy && (
              <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-700">
                🌶️ Spicier than your preference — try “덜 맵게 해 주세요” (less spicy).
              </p>
            )}
          </div>
        )}

        {/* Order card with quantity stepper */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold tracking-widest text-emerald-700">
              QUANTITY
            </span>
            <div className="flex items-center gap-3">
              <StepBtn label="Decrease quantity" onClick={() => setQty((q) => clampQty(q - 1))} disabled={qty <= MIN_QTY}>
                −
              </StepBtn>
              <span className="w-5 text-center text-lg font-bold tabular-nums">{qty}</span>
              <StepBtn label="Increase quantity" onClick={() => setQty((q) => clampQty(q + 1))} disabled={qty >= MAX_QTY}>
                +
              </StepBtn>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-white p-2.5">
            <div className="min-w-0">
              <p className="text-base font-bold">{orderPhrase.ko}</p>
              <p className="truncate text-xs italic text-emerald-700">{orderPhrase.roman}</p>
              <p className="truncate text-xs text-neutral-500">{orderPhrase.en}</p>
            </div>
            <button
              onClick={() => speak(orderPhrase.ko)}
              disabled={!voiceOk}
              aria-label={`Play: ${orderPhrase.ko}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg text-emerald-700 active:scale-90 disabled:opacity-40"
            >
              🔊
            </button>
          </div>
        </div>

        {/* Ask-the-vendor suggestions */}
        <div className="min-h-0">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-semibold tracking-widest text-neutral-400">
              💬 ASK THE VENDOR
            </p>
            {aiBadge && (
              <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-semibold text-violet-600">
                AI
              </span>
            )}
          </div>
          <div className="mt-1 space-y-1">
            {suggestions.length === 0 ? (
              <p className="text-[11px] text-neutral-400">Loading suggestions…</p>
            ) : (
              suggestions.map((s) => (
                <button
                  key={s.ko}
                  onClick={() => speak(s.ko)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg bg-neutral-50 px-2.5 py-1.5 text-left active:scale-[0.99]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{s.ko}</span>
                    <span className="block truncate text-[11px] text-neutral-500">{s.en}</span>
                  </span>
                  <span className="shrink-0 text-emerald-600">🔊</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepBtn({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xl font-bold text-emerald-700 shadow-sm active:scale-90 disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-neutral-100 px-2.5 py-1 font-medium text-neutral-700">
      {children}
    </span>
  );
}
