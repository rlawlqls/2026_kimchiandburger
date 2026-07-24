import { useMemo, useState, useSyncExternalStore } from "react";
import type { DetectedItem, MenuItem, UserProfile } from "../types";
import { hasKoreanVoice, speak, subscribeVoices } from "../utils/speak";
import { buildOrderPhrase, clampQty, MAX_QTY, MIN_QTY } from "../utils/orderPhrase";
import { otherPhrases, type OtherPhrase } from "../utils/otherPhrases";
import { artFor } from "../data/foodArt";
import { allergenEn, ingredientMatches } from "../data/allergens";

const SPICY_LABEL = ["Not spicy", "Mild", "Medium", "Spicy", "Very spicy"] as const;
const MAX_SPICE = 4;

export default function DetailView({
  item,
  profile,
  onSaveOrder,
  onListen,
}: {
  item: DetectedItem;
  profile: UserProfile;
  onSaveOrder: (menu: MenuItem, qty: number) => void;
  onListen: (menu: MenuItem, qty: number) => void;
}) {
  const { menu } = item;
  const price = item.ocrPrice ?? menu.priceTypical;
  // Re-renders once the voice list loads, so 🔊 un-disables itself (M6).
  const voiceOk = useSyncExternalStore(subscribeVoices, hasKoreanVoice, hasKoreanVoice);
  const art = artFor(menu.id);

  const [qty, setQty] = useState(1);
  const orderPhrase = useMemo(() => buildOrderPhrase(menu, qty), [menu, qty]);
  const others = useMemo(() => otherPhrases(menu, profile, qty), [menu, profile, qty]);

  // Allergens the user flagged that this dish contains.
  const flagged = menu.allergens.filter((a) => profile.allergies.includes(a));
  const spiceDiff = menu.spicy - profile.spiceTolerance;

  return (
    <>
      {/* Header: thumbnail + name */}
      <div className="flex items-center gap-3">
        <div className="flex h-[72px] w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--bg2)]">
          {menu.image ? (
            <img src={menu.image} alt={menu.meaning} className="h-full w-full object-cover" />
          ) : art ? (
            <svg
              viewBox="0 0 100 70"
              preserveAspectRatio="xMidYMid meet"
              className="h-full w-full"
              dangerouslySetInnerHTML={{ __html: art }}
            />
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
      </div>

      {/* Alert banner — allergens first, then spice, else safe */}
        {flagged.length > 0 ? (
          <Alert
            tone="danger"
            icon="🚫"
            title={`Contains your allergen — ${flagged.map(allergenEn).join(", ")}`}
          >
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

        {/* Other things you can say — situational, profile/dish-aware */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-black tracking-[-0.01em]">다른 표현</span>
            <span className="text-[10.5px] text-[var(--ink2)]">Other things you can say</span>
          </div>
          <div className="flex flex-col gap-2">
            {others.map((p, i) => (
              <OtherCard key={i} phrase={p} voiceOk={voiceOk} />
            ))}
          </div>
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
              const isAllergen = flagged.some((a) => ingredientMatches(ing, a));
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

        {/* Actions — save the order, or open the live "listen to vendor" helper */}
        <div className="flex gap-2.5 pt-0.5">
          <button
            onClick={() => onSaveOrder(menu, qty)}
            className="flex-1 rounded-[14px] bg-[var(--jade)] py-3.5 text-[15px] font-bold text-white transition active:scale-[0.975]"
          >
            Save this order
          </button>
          <button
            onClick={() => onListen(menu, qty)}
            className="flex-1 rounded-[14px] border border-[var(--line)] bg-white py-3.5 text-[15px] font-bold text-[var(--ink)] transition active:scale-[0.975]"
          >
            Listen to vendor
          </button>
        </div>
    </>
  );
}

function OtherCard({ phrase, voiceOk }: { phrase: OtherPhrase; voiceOk: boolean }) {
  const shell =
    phrase.tone === "allergy"
      ? "border-red-200 bg-[var(--gochu-bg)]"
      : phrase.tone === "spice"
        ? "border-amber-200 bg-[var(--amber-bg)]"
        : "border-[var(--line)] bg-white";
  const tagColor =
    phrase.tone === "allergy"
      ? "text-[var(--gochu)]"
      : phrase.tone === "spice"
        ? "text-[var(--amber)]"
        : "text-[var(--jade-d)]";
  return (
    <div className={`relative flex flex-col gap-[3px] rounded-[14px] border py-[11px] pl-[13px] pr-14 ${shell}`}>
      <span className={`text-[9.5px] font-bold leading-none tracking-[0.05em] ${tagColor}`}>
        {phrase.tag}
      </span>
      <p className="text-[19px] font-black leading-[1.2] tracking-[-0.01em]">{phrase.ko}</p>
      <p className="mono text-[11.5px] text-[var(--jade-d)]">{phrase.roman}</p>
      <p className="text-[11px] text-[var(--ink2)]">“{phrase.en}”</p>
      <button
        onClick={() => speak(phrase.ko)}
        disabled={!voiceOk}
        aria-label={`Play: ${phrase.ko}`}
        className="absolute right-[11px] top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--bg2)] text-base text-[var(--ink)] active:scale-90 disabled:opacity-40"
      >
        🔊
      </button>
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
