import { useCallback, useState } from "react";
import type { DetectedItem, OcrToken } from "./types";
import { resizeImage } from "./utils/resize";
import { runOcr } from "./utils/ocr";
import { detectMenuItems } from "./utils/detect";
import { useProfile } from "./hooks/useProfile";
import ScanView from "./components/ScanView";
import BoardView from "./components/BoardView";
import DetailView from "./components/DetailView";
import OrdersPanel from "./components/OrdersPanel";
import ProfilePanel from "./components/ProfilePanel";
import TabBar, { type Tab } from "./components/TabBar";

type ScanStage = "scan" | "board" | "detail";
type OcrState = "idle" | "loading" | "done" | "error";

export default function App() {
  const { profile, updateProfile, history, recordScan } = useProfile();

  const [tab, setTab] = useState<Tab>("scan");
  const [stage, setStage] = useState<ScanStage>("scan");
  const [boardImage, setBoardImage] = useState<string | null>(null);
  const [detected, setDetected] = useState<DetectedItem[]>([]);
  const [rawTokens, setRawTokens] = useState<OcrToken[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<DetectedItem | null>(null);
  const [ocrState, setOcrState] = useState<OcrState>("idle");
  const [engine, setEngine] = useState<"vision" | "tesseract" | null>(null);

  // scan → board (OCR done) → detail (tap) → board (back) → scan (rescan)
  const processImage = useCallback(async (source: File | Blob | string) => {
    setOcrState("loading");
    try {
      const resized = await resizeImage(source);
      const ocr = await runOcr(resized.base64, resized.width, resized.height);
      const items = detectMenuItems(ocr);
      setBoardImage(resized.dataUrl);
      setDetected(items);
      setRawTokens(ocr.tokens);
      setEngine(ocr.engine);
      setOcrState("done");
      setStage("board");
    } catch (err) {
      console.error("OCR pipeline failed:", err);
      setOcrState("error"); // ScanView shows retry guidance — never a dead end (§5-A)
    }
  }, []);

  const rescan = useCallback(() => {
    setStage("scan");
    setBoardImage(null);
    setDetected([]);
    setRawTokens([]);
    setSelectedMenu(null);
    setOcrState("idle");
    setEngine(null);
  }, []);

  // Only dishes the user actually opens are recorded (the tap = the interaction).
  const openDetail = useCallback(
    (item: DetectedItem) => {
      setSelectedMenu(item);
      setStage("detail");
      recordScan({
        menuId: item.menu.id,
        hangul: item.menu.hangul,
        roman: item.menu.roman,
        emoji: item.menu.emoji,
        timestamp: Date.now(),
      });
    },
    [recordScan],
  );

  return (
    <main className="min-h-dvh bg-neutral-100 sm:flex sm:items-center sm:justify-center sm:p-8">
      {/* Full-screen on phones; framed device preview on larger screens */}
      <div className="relative h-dvh w-full overflow-hidden bg-black sm:h-[812px] sm:max-w-[400px] sm:rounded-[3rem] sm:border-[10px] sm:border-neutral-900 sm:shadow-2xl">
        <div className="flex h-full w-full flex-col overflow-hidden bg-black text-white">
          {/* Active panel — fills all space above the tab bar, never scrolls */}
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {tab === "scan" && (
              <>
                {stage === "scan" && (
                  <ScanView
                    ocrState={ocrState}
                    onImage={processImage}
                    onRetry={() => setOcrState("idle")}
                  />
                )}
                {stage === "board" && boardImage && (
                  <BoardView
                    image={boardImage}
                    detected={detected}
                    rawTokens={rawTokens}
                    engine={engine}
                    onSelect={openDetail}
                    onRescan={rescan}
                  />
                )}
                {stage === "detail" && selectedMenu && (
                  <DetailView
                    item={selectedMenu}
                    profile={profile}
                    onBack={() => setStage("board")}
                  />
                )}
              </>
            )}

            {tab === "orders" && <OrdersPanel profile={profile} history={history} />}
            {tab === "profile" && <ProfilePanel profile={profile} onChange={updateProfile} />}
          </div>

          <TabBar active={tab} onChange={setTab} />
        </div>
      </div>
    </main>
  );
}
