import type { Allergen, SpiceLevel, UserProfile } from "../types";
import AppHeader from "./AppHeader";

const ALLERGENS: Allergen[] = ["gluten", "seafood", "egg", "dairy", "soy", "nuts"];
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
    <div className="flex h-full flex-col bg-white text-neutral-900">
      <AppHeader name={profile.name} subtitle="Your preferences" />

      <div className="flex-1 overflow-hidden px-5 pt-4">
        {/* Name */}
        <label className="text-[11px] font-semibold tracking-widest text-neutral-500">NAME</label>
        <input
          type="text"
          value={profile.name}
          onChange={(e) => onChange({ name: e.target.value.slice(0, 24) })}
          placeholder="Enter your name"
          className="mt-1 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-base outline-none focus:border-emerald-400"
        />

        {/* Spice tolerance */}
        <p className="mt-5 text-[11px] font-semibold tracking-widest text-neutral-500">
          SPICE TOLERANCE
        </p>
        <div className="mt-2 flex gap-1.5">
          {[0, 1, 2, 3, 4].map((lvl) => {
            const on = lvl === profile.spiceTolerance;
            return (
              <button
                key={lvl}
                onClick={() => onChange({ spiceTolerance: lvl as SpiceLevel })}
                className={`flex-1 rounded-lg py-2 text-sm transition-colors ${
                  on ? "bg-red-500 text-white" : "bg-neutral-100 text-neutral-400"
                }`}
                aria-pressed={on}
              >
                {lvl === 0 ? "🙂" : "🌶️".repeat(lvl)}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-neutral-500">{SPICE_LABELS[profile.spiceTolerance]}</p>

        {/* Allergies */}
        <p className="mt-5 text-[11px] font-semibold tracking-widest text-neutral-500">
          ALLERGIES — TAP TO AVOID
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ALLERGENS.map((a) => {
            const on = profile.allergies.includes(a);
            return (
              <button
                key={a}
                onClick={() => toggleAllergy(a)}
                aria-pressed={on}
                className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  on
                    ? "bg-amber-500 text-white"
                    : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                }`}
              >
                {on ? "⚠️ " : ""}
                {a}
              </button>
            );
          })}
        </div>

        <p className="mt-6 rounded-2xl bg-neutral-100 p-3 text-xs leading-relaxed text-neutral-500">
          💡 We use these to warn you about dishes and to suggest the right Korean phrases when you
          order. Everything stays on this device.
        </p>
      </div>
    </div>
  );
}
