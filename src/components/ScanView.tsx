import { useCallback, useEffect, useRef, useState } from "react";
import type { DetectedItem, UserProfile } from "../types";
import { cropFromMedia, type BoxPct } from "../utils/crop";

interface Props {
  ocrState: "idle" | "loading" | "done" | "error";
  detected: DetectedItem[];
  profile: UserProfile;
  /** parent runs the real OCR pipeline on the cropped region */
  onImage: (source: string | File | Blob) => void;
  onReset: () => void;
  onSelect: (item: DetectedItem) => void;
}

// Default crop box, matching the mockup (8% / 24% / 84% / 48%).
const DEFAULT_BOX: BoxPct = { left: 0.08, top: 0.24, width: 0.84, height: 0.48 };
const MIN_W = 0.18;
const MIN_H = 0.14;

type Media = "camera" | "photo" | "none";

export default function ScanView({
  ocrState,
  detected,
  profile,
  onImage,
  onReset,
  onSelect,
}: Props) {
  const finderRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const photoRef = useRef<HTMLImageElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [box, setBox] = useState<BoxPct>(DEFAULT_BOX);
  const [media, setMedia] = useState<Media>("none");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [askUpload, setAskUpload] = useState(false);

  const showResults = ocrState === "done" || ocrState === "error";

  // Start the camera whenever we are back to an idle finder (and not showing a photo).
  useEffect(() => {
    if (ocrState !== "idle" || photoUrl) return;
    let cancelled = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMedia("none");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setMedia("camera");
      } catch {
        setMedia("none");
      }
    };

    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [ocrState, photoUrl]);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => () => stopStream(), []);

  // ---- drag / resize the crop box ----
  const dragRef = useRef<{ mode: "move" | "size"; startX: number; startY: number; box: BoxPct } | null>(
    null,
  );

  const onPointerDown = (mode: "move" | "size") => (e: React.PointerEvent) => {
    if (showResults) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, box };
  };

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    const finder = finderRef.current;
    if (!d || !finder) return;
    const rect = finder.getBoundingClientRect();
    const dx = (e.clientX - d.startX) / rect.width;
    const dy = (e.clientY - d.startY) / rect.height;

    if (d.mode === "move") {
      const left = clamp(d.box.left + dx, 0, 1 - d.box.width);
      const top = clamp(d.box.top + dy, 0, 1 - d.box.height);
      setBox({ ...d.box, left, top });
    } else {
      const width = clamp(d.box.width + dx, MIN_W, 1 - d.box.left);
      const height = clamp(d.box.height + dy, MIN_H, 1 - d.box.top);
      setBox({ ...d.box, width, height });
    }
  }, []);

  const onPointerUp = () => {
    dragRef.current = null;
  };

  // ---- read the boxed region ----
  const readArea = () => {
    const finder = finderRef.current;
    const source = media === "photo" ? photoRef.current : videoRef.current;
    if (!finder || !source) return;
    const rect = finder.getBoundingClientRect();
    const dataUrl = cropFromMedia(source, box, { width: rect.width, height: rect.height });
    if (!dataUrl) return;
    onImage(dataUrl);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    stopStream();
    const url = URL.createObjectURL(file);
    setPhotoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setMedia("photo");
    setBox(DEFAULT_BOX);
  };

  const retake = () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(null);
    setBox(DEFAULT_BOX);
    onReset();
  };

  const warnN = detected.filter((it) =>
    it.menu.allergens.some((a) => profile.allergies.includes(a)),
  ).length;

  return (
    <div className="flex min-h-full flex-col gap-3 px-[18px] pb-2 pt-4">
      {/* eyebrow */}
      <div className="flex items-baseline justify-between">
        <div className="text-[22px] font-black tracking-[-0.02em]">Scan</div>
        <span className="text-xs text-[var(--ink2)]">Only the box is read</span>
      </div>

      {/* finder */}
      <div
        ref={finderRef}
        className="relative h-[296px] shrink-0 overflow-hidden rounded-2xl bg-[#2e2e32] select-none"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {media === "photo" && photoUrl ? (
          <img
            ref={photoRef}
            src={photoUrl}
            alt="Menu to read"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {media === "none" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-6 text-center text-[12.5px] leading-relaxed text-white/70">
            <span className="text-2xl opacity-40">⌗</span>
            <span>
              Camera unavailable —
              <br />
              tap <b className="text-white">Upload photo</b> to read a menu
            </span>
          </div>
        )}

        {/* crop box */}
        {!showResults && media !== "none" && (
          <div
            className="absolute cursor-grab touch-none"
            style={{
              left: `${box.left * 100}%`,
              top: `${box.top * 100}%`,
              width: `${box.width * 100}%`,
              height: `${box.height * 100}%`,
            }}
            onPointerDown={onPointerDown("move")}
          >
            <div className="absolute inset-0 rounded-md shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
            <Bracket className="left-[-2px] top-[-2px] border-b-0 border-r-0" />
            <Bracket className="right-[-2px] top-[-2px] border-b-0 border-l-0" />
            <Bracket className="bottom-[-2px] left-[-2px] border-r-0 border-t-0" />
            <Bracket className="bottom-[-2px] right-[-2px] border-l-0 border-t-0" />
            <div
              onPointerDown={onPointerDown("size")}
              className="absolute -bottom-3 -right-3 h-[26px] w-[26px] cursor-nwse-resize rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
            />
            {/* scanline sweep while reading */}
            {ocrState === "loading" && (
              <div className="animate-scan absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent" />
            )}
          </div>
        )}

        {/* hint */}
        {!showResults && (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between text-[11px] text-white/80">
            <span>{ocrState === "loading" ? "Reading…" : "Drag the box over the sign"}</span>
          </div>
        )}
      </div>

      {/* action buttons */}
      <div className="flex gap-2.5">
        <button
          onClick={readArea}
          disabled={ocrState === "loading" || showResults || media === "none"}
          className="flex-1 rounded-[14px] bg-[var(--ink)] py-3.5 text-[15px] font-bold text-white transition active:scale-[0.975] disabled:opacity-40"
        >
          {ocrState === "loading" ? "Reading…" : "Read this area"}
        </button>
        <button
          onClick={() => setAskUpload(true)}
          disabled={ocrState === "loading"}
          className="flex-1 rounded-[14px] border border-[var(--line)] bg-white py-3.5 text-[15px] font-bold text-[var(--ink)] transition active:scale-[0.975] disabled:opacity-40"
        >
          Upload photo
        </button>
      </div>

      {/* results */}
      <div className="flex min-h-0 flex-1 flex-col gap-2.5">
        {!showResults ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1.5 text-center text-[12.5px] leading-relaxed text-[var(--ink2)]">
            <span className="text-3xl opacity-35">⌗</span>
            <span>
              Point the box at a menu sign
              <br />
              and tap <b>Read this area</b>
            </span>
          </div>
        ) : detected.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1.5 text-center text-[12.5px] leading-relaxed text-[var(--ink2)]">
            <span className="text-3xl opacity-35">🔍</span>
            <span>
              {ocrState === "error" ? "Couldn't read this area" : "No dishes recognized"}
              <br />
              Move the box or try a clearer shot
            </span>
            <button onClick={retake} className="mt-1 text-xs font-medium text-[var(--blue)]">
              Retake
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-[var(--ink2)]">
                {detected.length} found
                {warnN > 0 && <b className="text-[var(--gochu)]"> · {warnN} to check</b>}
              </span>
              <button onClick={retake} className="text-xs font-medium text-[var(--blue)]">
                Retake
              </button>
            </div>
            <div className="flex flex-wrap content-start gap-2">
              {detected.map((it) => {
                const warn = it.menu.allergens.some((a) => profile.allergies.includes(a));
                return (
                  <button
                    key={it.menu.id}
                    onClick={() => onSelect(it)}
                    className={`flex items-center gap-2 rounded-[13px] border px-3 py-2.5 text-left transition active:scale-[0.96] ${
                      warn ? "border-red-300 bg-[var(--gochu-bg)]" : "border-[var(--line)] bg-white"
                    }`}
                  >
                    <span>
                      <span className="block text-[15px] font-bold">{it.menu.hangul}</span>
                      <span className="mt-px block text-[11px] text-[var(--ink2)]">
                        {it.menu.meaning}
                      </span>
                    </span>
                    {warn && (
                      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--gochu)] text-[11px] text-white">
                        !
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
        aria-hidden="true"
      />

      {/* upload-permission dialog (mockup modal) */}
      {askUpload && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 px-8">
          <div className="flex w-full max-w-[320px] flex-col gap-3 rounded-[20px] bg-white p-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
            <div className="text-3xl">📷</div>
            <h3 className="text-[17px] font-black">Photo access</h3>
            <p className="text-[12.5px] leading-relaxed text-[var(--ink2)]">
              Allow Jangbogi to open one photo from your device. We only read the menu text — the
              image never leaves your phone except to recognize the menu.
            </p>
            <div className="mt-1 flex gap-2.5">
              <button
                onClick={() => setAskUpload(false)}
                className="flex-1 rounded-[14px] border border-[var(--line)] bg-white py-3 text-[15px] font-bold text-[var(--ink)] active:scale-[0.975]"
              >
                Don't allow
              </button>
              <button
                onClick={() => {
                  setAskUpload(false);
                  fileRef.current?.click();
                }}
                className="flex-1 rounded-[14px] bg-[var(--ink)] py-3 text-[15px] font-bold text-white active:scale-[0.975]"
              >
                Allow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Bracket({ className = "" }: { className?: string }) {
  return <div className={`absolute h-5 w-5 rounded-[2px] border-[3px] border-white ${className}`} />;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
