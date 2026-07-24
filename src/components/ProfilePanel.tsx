import { ALLERGENS, allergenEn } from "../data/allergens";
import type { Allergen, SpiceLevel, UserProfile } from "../types";

const SPICE_LABELS = ["Not spicy", "Mild", "Medium", "Spicy", "Very spicy"] as const;

export default function ProfilePanel({
  profile,
  onChange,
}: {
  profile: UserProfile;
  onChange: (patch: Partial<UserProfile>) => void;
}) {
  const toggleAllergy = (a: Allergen) => {
    const has = profile.allergies.includes(a);
    onChange({
      allergies: has ? profile.allergies.filter((x) => x !== a) : [...profile.allergies, a],
    });
  };

  return (
    <div className="flex h-full flex-col bg-[var(--bg)] text-[var(--ink)]">
      <div className="flex-1 overflow-y-auto px-[18px] pb-5 pt-4">
        <div className="flex items-baseline justify-between">
          <div className="text-[22px] font-black tracking-[-0.02em]">Profile</div>
          <span className="text-xs text-[var(--ink2)]">Saved automatically</span>
        </div>
        <div className="mb-4" />

        {/* Name */}
        <label className="text-[11px] font-bold text-[var(--ink2)]">NAME</label>
        <div className="relative mt-1.5">
          <input
            type="text"
            value={profile.name}
            onChange={(e) => onChange({ name: e.target.value.slice(0, 24) })}
            placeholder="Your name"
            className="w-full rounded-xl border border-[var(--line)] bg-white py-3 pl-3.5 pr-11 text-[15px] outline-none focus:border-[var(--ink)]"
          />
          {profile.name && (
            <button
              type="button"
              onClick={() => onChange({ name: "" })}
              aria-label="Clear name"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--line)] text-sm text-[var(--ink2)] transition active:bg-gray-300"
            >
              ✕
            </button>
          )}
        </div>

        {/* Spice tolerance */}
        <p className="mt-5 text-[11px] font-bold text-[var(--ink2)]">
          MY SPICE LIMIT ·{" "}
          <span className="font-medium">{SPICE_LABELS[profile.spiceTolerance]}</span>
        </p>
        <div className="mt-2 flex gap-1.5">
          {[0, 1, 2, 3, 4].map((lvl) => {
            const on = lvl <= profile.spiceTolerance;
            return (
              <button
                key={lvl}
                onClick={() => onChange({ spiceTolerance: lvl as SpiceLevel })}
                aria-pressed={lvl === profile.spiceTolerance}
                className={`flex-1 rounded-[11px] border py-2.5 text-[15px] transition ${
                  on
                    ? "border-red-300 bg-[var(--gochu-bg)]"
                    : "border-[var(--line)] bg-white opacity-40 grayscale"
                }`}
              >
                {lvl === 0 ? "❄" : "🌶"}
              </button>
            );
          })}
        </div>

        {/* Allergies */}
        <p className="mt-5 text-[11px] font-bold text-[var(--ink2)]">
          ALLERGIES — TAP TO TOGGLE
        </p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {ALLERGENS.map((a) => {
            const on = profile.allergies.includes(a.id);
            return (
              <button
                key={a.id}
                onClick={() => toggleAllergy(a.id)}
                aria-pressed={on}
                className={`flex flex-col items-center gap-0.5 rounded-[11px] border px-1 py-2 leading-tight transition ${
                  on
                    ? "border-transparent bg-[var(--gochu)] text-white"
                    : "border-[var(--line)] bg-white text-[var(--ink)]"
                }`}
              >
                <span className="text-[11px] font-bold">{a.en}</span>
                <span className={`text-[9.5px] font-medium ${on ? "opacity-80" : "opacity-55"}`}>
                  {a.koLabel ?? a.ko}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-5 rounded-xl bg-[var(--bg2)] p-3 text-xs leading-relaxed text-[var(--ink2)]">
          {profile.allergies.length
            ? `${profile.name || "Guest"} · spice ${SPICE_LABELS[profile.spiceTolerance]} · avoiding ${profile.allergies
                .map(allergenEn)
                .join(", ")}`
            : `${profile.name || "Guest"} · spice ${SPICE_LABELS[profile.spiceTolerance]} · no allergies set`}
        </p>
      </div>
    </div>
  );
}
