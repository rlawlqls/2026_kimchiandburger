/** golmokmal-style top bar: greeting + preference chips (§2b). Rendered once,
 *  globally, above every tab. */
export default function AppHeader({
  name,
  spice,
  allergyCount,
}: {
  name: string;
  spice: number;
  allergyCount: number;
}) {
  const display = name.trim() || "Guest";

  return (
    <header className="z-20 shrink-0 border-b border-[var(--line)] bg-white/90 px-[18px] pb-2.5 pt-0.5 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <div className="flex-1 text-[21px] font-black tracking-[-0.02em] text-[var(--ink)]">
          Hi, <span>{display}</span>
        </div>
      </div>

      <div className="mt-2 flex gap-1.5">
        <span className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-2.5 py-[5px] text-[11.5px] font-medium text-[var(--ink2)]">
          🌶 <b className="font-bold text-[var(--ink)]">{spice}</b>
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-2.5 py-[5px] text-[11.5px] font-medium text-[var(--ink2)]">
          ⚠️ <b className="font-bold text-[var(--ink)]">{allergyCount}</b>
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-white px-2.5 py-[5px] text-[11.5px] font-medium text-[var(--ink2)]">
          📍 Songjeong Market
        </span>
      </div>
    </header>
  );
}
