export type Tab = "scan" | "orders" | "profile";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "scan", label: "Scan", icon: "📷" },
  { id: "orders", label: "Orders", icon: "🧾" },
  { id: "profile", label: "Profile", icon: "👤" },
];

export default function TabBar({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
}) {
  return (
    <nav className="z-30 flex shrink-0 items-stretch border-t border-neutral-200 bg-white pb-2 pt-1">
      {TABS.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            aria-current={on ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors ${
              on ? "text-emerald-600" : "text-neutral-400"
            }`}
          >
            <span className={`text-lg ${on ? "" : "opacity-70"}`}>{t.icon}</span>
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
