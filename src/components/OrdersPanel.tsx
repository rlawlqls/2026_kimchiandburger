import { useState } from "react";
import type { ScanHistoryEntry, UserProfile } from "../types";
import { MENU_DB } from "../data/menuDb";
import { historyStamp } from "../utils/time";
import Pager from "./Pager";

const PER_PAGE = 5;

export default function OrdersPanel({
  profile,
  history,
  onOpen,
  onClear,
}: {
  profile: UserProfile;
  history: ScanHistoryEntry[];
  onOpen: (menuId: string) => void;
  onClear: () => void;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(history.length / PER_PAGE));
  const safePage = Math.min(page, pages - 1);
  const rows = history.slice(safePage * PER_PAGE, safePage * PER_PAGE + PER_PAGE);

  return (
    <div className="flex h-full flex-col px-[18px] pb-2 pt-4">
      <div className="flex items-baseline justify-between">
        <div className="text-[22px] font-black tracking-[-0.02em]">History</div>
        {history.length > 0 && (
          <button onClick={onClear} className="text-xs font-medium text-[var(--blue)]">
            Clear all
          </button>
        )}
      </div>
      <p className="mt-0.5 text-xs text-[var(--ink2)]">Only what you tapped is saved</p>

      {history.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 text-center">
          <p className="text-3xl opacity-35">◷</p>
          <p className="text-[12.5px] leading-relaxed text-[var(--ink2)]">
            Tap a scanned dish and
            <br />
            it will be saved here with the time
          </p>
        </div>
      ) : (
        <>
          <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
            {rows.map((h) => {
              const menu = MENU_DB.find((m) => m.id === h.menuId);
              const risk = menu
                ? menu.allergens.some((a) => profile.allergies.includes(a))
                : false;
              const dot =
                h.action === "Ordered"
                  ? "bg-[var(--jade)]"
                  : risk
                    ? "bg-[var(--gochu)]"
                    : "bg-[var(--ink2)]";
              const stamp = historyStamp(h.timestamp);
              return (
                <button
                  key={`${h.menuId}-${h.timestamp}`}
                  onClick={() => menu && onOpen(h.menuId)}
                  aria-label={`Open ${h.hangul}`}
                  className="flex w-full items-center gap-3 rounded-[14px] border border-[var(--line)] bg-white px-3.5 py-3 text-left active:scale-[0.99]"
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold">{h.hangul}</span>
                    <span className="block truncate text-[11.5px] text-[var(--ink2)]">
                      {h.en || menu?.meaning || "Sign phrase"} · {h.action}
                    </span>
                  </span>
                  <span className="mono shrink-0 text-right text-[10.5px] leading-tight text-[var(--ink2)]">
                    {stamp.day}
                    <br />
                    {stamp.time}
                  </span>
                </button>
              );
            })}
          </div>
          <Pager page={safePage} pages={pages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
