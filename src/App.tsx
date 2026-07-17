import { useCallback, useState } from "react";
import type { DetectedItem, OcrToken } from "./types";
import { resizeImage } from "./utils/resize";
import { runOcr } from "./utils/ocr";
import { detectMenuItems } from "./utils/detect";
import ScanView from "./components/ScanView";
import BoardView from "./components/BoardView";
import DetailView from "./components/DetailView";

type View = "scan" | "board" | "detail";
type OcrState = "idle" | "loading" | "done" | "error";

export default function App() {
  const [view, setView] = useState<View>("scan");
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
      setView("board");
    } catch (err) {
      console.error("OCR pipeline failed:", err);
      setOcrState("error"); // ScanView shows retry guidance — never a dead end (§5-A)
    }
  }, []);

  const rescan = useCallback(() => {
    setView("scan");
    setBoardImage(null);
    setDetected([]);
    setRawTokens([]);
    setSelectedMenu(null);
    setOcrState("idle");
    setEngine(null);
  }, []);

  return (
    <main className="min-h-dvh bg-neutral-100 sm:flex sm:items-center sm:justify-center sm:p-8">
      {/* Full-screen on phones; framed device preview on larger screens */}
      <div className="relative h-dvh w-full overflow-hidden bg-black sm:h-[812px] sm:max-w-[400px] sm:rounded-[3rem] sm:border-[10px] sm:border-neutral-900 sm:shadow-2xl">
        <div className="relative h-full w-full overflow-hidden bg-black text-white">
          {view === "scan" && (
            <ScanView ocrState={ocrState} onImage={processImage} onRetry={() => setOcrState("idle")} />
          )}
          {view === "board" && boardImage && (
            <BoardView
              image={boardImage}
              detected={detected}
              rawTokens={rawTokens}
              engine={engine}
              onSelect={(item) => {
                setSelectedMenu(item);
                setView("detail");
              }}
              onRescan={rescan}
            />
          )}
          {view === "detail" && selectedMenu && (
            <DetailView item={selectedMenu} onBack={() => setView("board")} />
          )}
        </div>
      </div>
    </main>
  );
}
