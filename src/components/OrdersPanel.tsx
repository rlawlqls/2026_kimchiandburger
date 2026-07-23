import type { ScanHistoryEntry, UserProfile } from "../types";
import { timeAgo } from "../utils/time";
import { speak } from "../utils/speak";
import AppHeader from "./AppHeader";

// How many timeline rows fit the fixed frame without scrolling (§6).
const VISIBLE = 7;

export default function OrdersPanel({
  profile,
  history,
}: {
  profile: UserProfile;
  history: ScanHistoryEntry[];
}) {
  const shown = history.slice(0, VISIBLE);
  const extra = history.length - shown.length;

  return (
    <div className="flex h-full flex-col bg-white text-neutral-900">
      <AppHeader name={profile.name} subtitle="Recently scanned" />

      <div className="flex-1 overflow-hidden px-4 pt-3">
        <p className="text-[11px] font-semibold tracking-widest text-neutral-500">SCAN TIMELINE</p>

        {history.length === 0 ? (
          <div className="mt-10 text-center">
            <p className="text-4xl">🧾</p>
            <p className="mt-3 text-sm font-medium text-neutral-700">No items yet</p>
            <p className="mt-1 text-xs text-neutral-400">
              Scan a menu and tap a dish — it will show up here.
            </p>
          </div>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {shown.map((h) => (
              <li
                key={h.menuId}
                className="flex items-center gap-3 rounded-xl bg-neutral-50 px-3 py-2"
              >
                <span className="text-2xl" aria-hidden>
                  {h.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold">{h.hangul}</span>
                  <span className="block truncate text-xs italic text-emerald-700">{h.roman}</span>
                </span>
                <span className="shrink-0 text-[11px] text-neutral-400">{timeAgo(h.timestamp)}</span>
                <button
                  onClick={() => speak(h.hangul)}
                  aria-label={`Play pronunciation: ${h.hangul}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 active:scale-90"
                >
                  🔊
                </button>
              </li>
            ))}
            {extra > 0 && (
              <li className="pt-1 text-center text-[11px] text-neutral-400">
                + {extra} earlier item{extra > 1 ? "s" : ""}
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
