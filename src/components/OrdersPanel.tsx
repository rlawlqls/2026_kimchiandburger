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
    <div className="flex h-full flex-col bg-[var(--bg)] text-[var(--ink)]">
      <AppHeader
        name={profile.name}
        spice={profile.spiceTolerance}
        allergyCount={profile.allergies.length}
      />

      <div className="flex-1 overflow-hidden px-[18px] pt-4">
        <div className="mb-2 text-[22px] font-black tracking-[-0.02em]">History</div>
        <p className="text-xs text-[var(--ink2)]">Only what you tapped is saved</p>

        {history.length === 0 ? (
          <div className="mt-14 flex flex-col items-center gap-1.5 text-center">
            <p className="text-3xl opacity-35">◷</p>
            <p className="text-[12.5px] leading-relaxed text-[var(--ink2)]">
              Tap a scanned dish and
              <br />
              it will be saved here with the time
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {shown.map((h) => (
              <li key={`${h.menuId}-${h.timestamp}`}>
                <button
                  onClick={() => speak(h.hangul)}
                  aria-label={`Play pronunciation: ${h.hangul}`}
                  className="flex w-full items-center gap-3 rounded-[14px] border border-[var(--line)] bg-white px-3.5 py-3 text-left active:scale-[0.99]"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--jade)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold">{h.hangul}</span>
                    <span className="block truncate text-[11.5px] text-[var(--ink2)]">
                      {h.roman}
                    </span>
                  </span>
                  <span className="mono shrink-0 text-[10.5px] text-[var(--ink2)]">
                    {timeAgo(h.timestamp)}
                  </span>
                </button>
              </li>
            ))}
            {extra > 0 && (
              <li className="pt-1 text-center text-[11px] text-[var(--ink2)]">
                + {extra} earlier item{extra > 1 ? "s" : ""}
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
