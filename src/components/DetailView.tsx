import { useEffect, useMemo, useState } from "react";
import type { DetectedItem, UserProfile } from "../types";
import { hasKoreanVoice, speak } from "../utils/speak";
import { buildOrderPhrase, clampQty, MAX_QTY, MIN_QTY } from "../utils/orderPhrase";
import { suggestPhrases, type SuggestedPhrase } from "../utils/gemini";

const SPICY_LABEL = ["Not spicy", "Mild", "Medium", "Spicy", "Very spicy"] as const;
const MAX_SPICE = 4;

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
  const spiceDiff = menu.spicy - profile.spiceTolerance;

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
    <div className="flex h-full flex-col overflow-hidden bg-[var(--bg)] text-[var(--ink)]">
      {/* Back bar */}
      <div className="z-20 flex shrink-0 items-center gap-2 border-b border-[var(--line)] bg-white/90 px-4 pb-2.5 pt-9 backdrop-blur">
        <button
          onClick={onBack}
          className="rounded-full bg-[var(--bg2)] px-3 py-1.5 text-sm font-medium text-[var(--ink)] active:scale-95"
        >
          ← Menu
        </button>
        <span className="ml-auto text-[11px] font-bold tracking-[0.1em] text-[var(--jade)]">
          HOW TO ORDER
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-[18px] pb-5 pt-4">
        {/* Header: thumbnail + name */}
        <div className="flex items-center gap-3">
          <div className="flex h-[72px] w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--bg2)]">
            {menu.image ? (
              <img src={menu.image} alt={menu.meaning} className="h-full w-full object-cover" />
            ) : (
              <span className="text-4xl" role="img" aria-label={menu.meaning}>
                {menu.emoji}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[21px] font-black leading-[1.15] tracking-[-0.02em]">
              {menu.meaning}
            </h1>
            <p className="mt-[3px] truncate text-[11.5px] text-[var(--ink2)]">
              {menu.hangul} · {menu.roman}
            </p>
            <p className="mono mt-[5px] text-[15px] font-semibold">{price}</p>
          </div>
          <button
            onClick={() => speak(menu.hangul)}
            disabled={!voiceOk}
            aria-label={`Play pronunciation: ${menu.hangul}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--jade)]/10 text-sm text-[var(--jade-d)] active:scale-90 disabled:opacity-40"
          >
            🔊
          </button>
        </div>

        {/* Alert banner — allergens first, then spice, else safe */}
        {flagged.length > 0 ? (
          <Alert tone="danger" icon="🚫" title={`Contains your allergen — ${flagged.join(", ")}`}>
            See the red ingredients below. Confirm with the vendor before ordering.
          </Alert>
        ) : menu.spicy > 0 && spiceDiff >= 2 ? (
          <Alert tone="hot" icon="🌶️" title={`Much spicier than your limit (${profile.spiceTolerance})`}>
            Say “덜 맵게 해주세요” (deol maep-ge hae-ju-se-yo) — “less spicy, please”.
          </Alert>
        ) : menu.spicy > 0 && spiceDiff === 1 ? (
          <Alert tone="hot" icon="🌶️" title="Slightly spicy for you">
            Your limit {profile.spiceTolerance} · this dish {menu.spicy} out of {MAX_SPICE}
          </Alert>
        ) : (
          <Alert tone="safe" icon="✓" title="Safe for you">
            No allergen match{menu.spicy === 0 ? " · not spicy" : " · within your spice limit"}
          </Alert>
        )}

        {/* Quantity stepper */}
        <div className="flex items-center justify-center gap-[22px] py-0.5">
          <StepBtn label="Decrease quantity" onClick={() => setQty((q) => clampQty(q - 1))} disabled={qty <= MIN_QTY}>
            −
          </StepBtn>
          <span className="mono min-w-[56px] text-center text-[34px] font-black tabular-nums">
            {qty}
          </span>
          <StepBtn label="Increase quantity" onClick={() => setQty((q) => clampQty(q + 1))} disabled={qty >= MAX_QTY}>
            +
          </StepBtn>
        </div>

        {/* Say-this box */}
        <div className="relative rounded-[18px] bg-[var(--ink)] px-4 pb-[15px] pt-4 text-white">
          <p className="mb-2 text-[10.5px] font-bold tracking-[0.1em] text-white/55">
            SAY THIS AT THE STALL
          </p>
          <p className="pr-14 text-[26px] font-black leading-[1.25] tracking-[-0.02em]">
            {orderPhrase.ko}
          </p>
          <p className="mono mt-2 pr-14 text-[13px] text-emerald-300">{orderPhrase.roman}</p>
          <p className="mt-1.5 pr-14 text-[11.5px] text-white/55">{orderPhrase.en}</p>
          <button
            onClick={() => speak(orderPhrase.ko)}
            disabled={!voiceOk}
            aria-label={`Play: ${orderPhrase.ko}`}
            className="absolute right-4 top-1/2 flex h-[46px] w-[46px] -translate-y-1/2 items-center justify-center rounded-full bg-[var(--jade)] text-lg text-white shadow-[0_4px_14px_rgba(16,185,129,0.4)] active:scale-95 disabled:opacity-40"
          >
            🔊
          </button>
        </div>

        {/* Story / description */}
        {menu.story && (
          <p className="text-[12.5px] leading-[1.6] text-[var(--ink2)]">{menu.story}</p>
        )}

        {/* Spice meter */}
        <div>
          <div className="flex items-baseline justify-between text-[11.5px] text-[var(--ink2)]">
            <span>Spice level</span>
            <b className="text-[12.5px] text-[var(--ink)]">
              {menu.spicy} / {MAX_SPICE} · {SPICY_LABEL[menu.spicy]} · your limit {profile.spiceTolerance}
            </b>
          </div>
          <div className="relative mt-1.5 h-2 overflow-visible rounded-[5px] bg-[var(--bg2)]">
            <i
              className="block h-full rounded-[5px] bg-[var(--gochu)]"
              style={{ width: `${(menu.spicy / MAX_SPICE) * 100}%` }}
            />
            <u
              className="absolute -top-[3px] h-[14px] w-0.5 bg-[var(--ink)] opacity-55"
              style={{ left: `${(profile.spiceTolerance / MAX_SPICE) * 100}%` }}
            />
          </div>
        </div>

        {/* Ingredients */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-[11.5px] text-[var(--ink2)]">
            <span>Ingredients</span>
            {flagged.length > 0 && (
              <b className="text-[var(--gochu)]">red = your allergen</b>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {menu.ingredients.map((ing) => {
              const isAllergen = flagged.some((a) => ing.toLowerCase().includes(a));
              return (
                <span
                  key={ing}
                  className={`rounded-[9px] px-2.5 py-[5px] text-[11.5px] font-semibold ${
                    isAllergen ? "bg-[var(--gochu)] text-white" : "bg-[var(--bg2)] text-[var(--ink)]"
                  }`}
                >
                  {ing}
                </span>
              );
            })}
          </div>
        </div>

        {/* Ask-the-vendor suggestions */}
        <div className="min-h-0">
          <div className="mb-1.5 flex items-center gap-2 text-[11.5px] text-[var(--ink2)]">
            <span>💬 Ask the vendor</span>
            {aiBadge && (
              <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-semibold text-violet-600">
                AI
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {suggestions.length === 0 ? (
              <p className="text-[11.5px] text-[var(--ink2)]">Loading suggestions…</p>
            ) : (
              suggestions.map((s) => (
                <button
                  key={s.ko}
                  onClick={() => speak(s.ko)}
                  className="flex w-full items-center justify-between gap-2 rounded-[13px] border border-[var(--line)] bg-white px-3 py-2.5 text-left active:scale-[0.99]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-bold">{s.ko}</span>
                    <span className="block truncate text-[11px] text-[var(--ink2)]">{s.en}</span>
                  </span>
                  <span className="shrink-0 text-[var(--jade-d)]">🔊</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Alert({
  tone,
  icon,
  title,
  children,
}: {
  tone: "danger" | "hot" | "safe";
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  const tones = {
    danger: "bg-[var(--gochu-bg)] border-red-200 text-red-700",
    hot: "bg-[var(--amber-bg)] border-amber-200 text-amber-700",
    safe: "bg-emerald-50 border-emerald-200 text-emerald-700",
  } as const;
  return (
    <div className={`flex items-start gap-2.5 rounded-[14px] border p-3.5 ${tones[tone]}`}>
      <div className="shrink-0 text-[19px] leading-tight">{icon}</div>
      <div>
        <div className="text-[13.5px] font-bold leading-snug">{title}</div>
        <div className="mt-[3px] text-[12px] leading-relaxed opacity-85">{children}</div>
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
      className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-[var(--bg2)] text-[23px] font-semibold text-[var(--ink)] active:bg-[var(--line)] disabled:opacity-30"
    >
      {children}
    </button>
  );
}
