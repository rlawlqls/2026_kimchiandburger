import { useCallback, useRef, useState } from "react";
import type { DetectedItem, MenuItem, OcrToken } from "./types";
import { MENU_DB } from "./data/menuDb";
import { resizeImage } from "./utils/resize";
import { runOcr } from "./utils/ocr";
import { detectMenuItems } from "./utils/detect";
import { buildOrderPhrase } from "./utils/orderPhrase";
import { speak } from "./utils/speak";
import { useProfile } from "./hooks/useProfile";
import AppHeader from "./components/AppHeader";
import ScanView from "./components/ScanView";
import GuideView from "./components/GuideView";
import DetailSheet from "./components/DetailSheet";
import ListenSheet from "./components/ListenSheet";
import OrdersPanel from "./components/OrdersPanel";
import ProfilePanel from "./components/ProfilePanel";
import StatusBar from "./components/StatusBar";
import TabBar, { type Tab } from "./components/TabBar";

type OcrState = "idle" | "loading" | "done" | "error";

// Build a DetectedItem from a plain menu entry (Guide / History taps have no bbox).
const asDetected = (menu: MenuItem): DetectedItem => ({
  menu,
  bbox: [0, 0, 0, 0],
  ocrPrice: null,
  sourceText: menu.hangul,
});

export default function App() {
  const { profile, updateProfile, history, recordScan, clearHistory } = useProfile();

  const [tab, setTab] = useState<Tab>("scan");
  const [detected, setDetected] = useState<DetectedItem[]>([]);
  const [, setRawTokens] = useState<OcrToken[]>([]);
  const [ocrState, setOcrState] = useState<OcrState>("idle");

  // Detail is a bottom sheet that can open over any tab (scan results, guide, history).
  const [sheetItem, setSheetItem] = useState<DetectedItem | null>(null);
  // "Listen to vendor" sheet — carries the dish + quantity it was opened for.
  const [listenCtx, setListenCtx] = useState<{ menu: MenuItem; qty: number } | null>(null);

  // Lightweight toast.
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const processImage = useCallback(
    async (source: File | Blob | string) => {
      setOcrState("loading");
      try {
        const resized = await resizeImage(source);
        const ocr = await runOcr(resized.base64, resized.width, resized.height);
        const items = detectMenuItems(ocr);
        setDetected(items);
        setRawTokens(ocr.tokens);
        setOcrState("done");
        showToast(
          items.length
            ? `${items.length} dish${items.length > 1 ? "es" : ""} recognized`
            : "No dishes recognized — try again",
        );
      } catch (err) {
        console.error("OCR pipeline failed:", err);
        setOcrState("error"); // ScanView shows retry guidance — never a dead end (§5-A)
      }
    },
    [showToast],
  );

  const resetScan = useCallback(() => {
    setDetected([]);
    setRawTokens([]);
    setOcrState("idle");
  }, []);

  // Open the detail sheet. `record` logs the tap to History (skip when re-opening
  // an item that is already in History).
  const openDetail = useCallback(
    (item: DetectedItem, record = true) => {
      setSheetItem(item);
      if (record) {
        recordScan({
          menuId: item.menu.id,
          hangul: item.menu.hangul,
          roman: item.menu.roman,
          en: item.menu.meaning,
          emoji: item.menu.emoji,
          action: "Viewed",
          timestamp: Date.now(),
        });
      }
    },
    [recordScan],
  );

  const openHistory = useCallback(
    (menuId: string) => {
      const menu = MENU_DB.find((m) => m.id === menuId);
      if (menu) openDetail(asDetected(menu), false);
    },
    [openDetail],
  );

  const saveOrder = useCallback(
    (menu: MenuItem, qty: number) => {
      recordScan({
        menuId: menu.id,
        hangul: `${menu.hangul} ${qty}개`,
        roman: menu.roman,
        en: menu.meaning,
        emoji: menu.emoji,
        action: "Ordered",
        timestamp: Date.now(),
      });
      speak(buildOrderPhrase(menu, qty).ko);
      showToast(`Saved: ${menu.meaning} × ${qty}`);
    },
    [recordScan, showToast],
  );

  const openListen = useCallback((menu: MenuItem, qty: number) => {
    setSheetItem(null); // close the detail sheet first
    setListenCtx({ menu, qty });
  }, []);

  return (
    <main className="min-h-dvh bg-[#e9eaee] sm:flex sm:items-center sm:justify-center sm:p-8">
      {/* Full-screen on phones; framed device preview on larger screens */}
      <div className="relative h-dvh w-full overflow-hidden bg-[#1c1c1e] sm:h-[812px] sm:max-w-[400px] sm:rounded-[44px] sm:border-[9px] sm:border-[#1c1c1e] sm:shadow-[0_30px_70px_rgba(0,0,0,0.28)]">
        <div className="relative flex h-full w-full flex-col overflow-hidden bg-[var(--bg)] text-[var(--ink)] sm:rounded-[36px]">
          <div className="notch" />
          <StatusBar />
          <AppHeader
            name={profile.name}
            spice={profile.spiceTolerance}
            allergyCount={profile.allergies.length}
          />

          {/* Active panel — fills all space above the tab bar */}
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {tab === "scan" && (
              <ScanView
                ocrState={ocrState}
                detected={detected}
                profile={profile}
                onImage={processImage}
                onReset={resetScan}
                onSelect={(item) => openDetail(item, true)}
              />
            )}
            {tab === "orders" && (
              <OrdersPanel
                profile={profile}
                history={history}
                onOpen={openHistory}
                onClear={clearHistory}
              />
            )}
            {tab === "guide" && (
              <GuideView profile={profile} onOpen={(menu) => openDetail(asDetected(menu), true)} />
            )}
            {tab === "profile" && <ProfilePanel profile={profile} onChange={updateProfile} />}
          </div>

          <TabBar active={tab} onChange={setTab} />

          {/* Detail bottom sheet — overlays the whole phone */}
          {sheetItem && (
            <DetailSheet
              item={sheetItem}
              profile={profile}
              onClose={() => setSheetItem(null)}
              onSaveOrder={saveOrder}
              onListen={openListen}
            />
          )}

          {/* Listen-to-vendor bottom sheet */}
          {listenCtx && (
            <ListenSheet
              menu={listenCtx.menu}
              qty={listenCtx.qty}
              profile={profile}
              onClose={() => setListenCtx(null)}
              onToast={showToast}
            />
          )}

          <div className={`toast ${toast ? "on" : ""}`} role="status" aria-live="polite">
            {toast}
          </div>
        </div>
      </div>
    </main>
  );
}
