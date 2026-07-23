export type Tab = "scan" | "orders" | "guide" | "profile";

// Glyph icons match the golmokmal mockup nav.
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "scan", label: "Scan", icon: "⌗" },
  { id: "orders", label: "History", icon: "◷" },
  { id: "guide", label: "Guide", icon: "▤" },
  { id: "profile", label: "Profile", icon: "☺" },
];

export default function TabBar({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
}) {
  return (
    <nav className="z-30 flex h-[72px] shrink-0 items-stretch border-t border-[var(--line)] bg-white/95 pb-2.5 backdrop-blur">
      {TABS.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            aria-current={on ? "page" : undefined}
            className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10.5px] transition-colors ${
              on ? "font-bold text-[var(--jade)]" : "font-medium text-[var(--ink2)]"
            }`}
          >
            <span className="text-[19px] leading-none">{t.icon}</span>
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
