import { useState } from "react";
import type { MenuItem, UserProfile } from "../types";
import { MENU_DB } from "../data/menuDb";
import { artFor } from "../data/foodArt";
import Pager from "./Pager";

const PER_PAGE = 6;

export default function GuideView({
  profile,
  onOpen,
}: {
  profile: UserProfile;
  onOpen: (menu: MenuItem) => void;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(MENU_DB.length / PER_PAGE));
  const safePage = Math.min(page, pages - 1);
  const items = MENU_DB.slice(safePage * PER_PAGE, safePage * PER_PAGE + PER_PAGE);

  return (
    <div className="flex h-full flex-col px-[18px] pb-2 pt-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[22px] font-black tracking-[-0.02em]">Food guide</span>
        <span className="text-xs text-[var(--ink2)]">{MENU_DB.length} dishes</span>
      </div>

      <div className="mt-3 grid min-h-0 flex-1 grid-cols-2 content-start gap-2.5 overflow-y-auto">
        {items.map((menu) => {
          const art = artFor(menu.id);
          const risk = menu.allergens.some((a) => profile.allergies.includes(a));
          return (
            <button
              key={menu.id}
              onClick={() => onOpen(menu)}
              className="flex flex-col overflow-hidden rounded-[14px] border border-[var(--line)] bg-white text-left active:scale-[0.98]"
            >
              <div className="relative flex h-[74px] items-center justify-center border-b border-[var(--line)] bg-[var(--bg2)]">
                {art ? (
                  <svg
                    viewBox="0 0 100 70"
                    preserveAspectRatio="xMidYMid meet"
                    className="h-full w-full"
                    dangerouslySetInnerHTML={{ __html: art }}
                  />
                ) : (
                  <span className="text-3xl" role="img" aria-label={menu.meaning}>
                    {menu.emoji}
                  </span>
                )}
                {risk && (
                  <span className="absolute right-1.5 top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[var(--gochu)] text-[11px] text-white shadow">
                    !
                  </span>
                )}
              </div>
              <div className="px-2.5 pt-2 text-[13.5px] font-bold leading-[1.25]">
                {menu.meaning}
              </div>
              <div className="px-2.5 pt-0.5 text-[10.5px] leading-[1.3] text-[var(--ink2)]">
                {menu.hangul} · {menu.roman}
              </div>
              <div className="mono mt-auto px-2.5 pb-2.5 pt-1 text-[10.5px] text-[var(--ink2)]">
                {menu.priceTypical.replace(/^₩?/, "₩")} ·{" "}
                {menu.spicy ? "🌶".repeat(menu.spicy) : "mild"}
              </div>
            </button>
          );
        })}
      </div>

      <Pager page={safePage} pages={pages} onChange={setPage} />
    </div>
  );
}
