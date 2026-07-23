/** Slim top bar shown on every tab — greets the user by name (§2b). */
export default function AppHeader({ name, subtitle }: { name: string; subtitle?: string }) {
  const display = name.trim() || "Guest";
  return (
    <header className="z-20 flex shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 pb-2 pt-9">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-neutral-900">👋 {display}</p>
        {subtitle && <p className="text-[11px] text-neutral-400">{subtitle}</p>}
      </div>
      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold tracking-widest text-emerald-600">
        장보기
      </span>
    </header>
  );
}
