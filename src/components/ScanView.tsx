import { useEffect, useRef, useState } from "react";
import { cropVideoToRect } from "../utils/crop";

interface Props {
  ocrState: "idle" | "loading" | "done" | "error";
  onImage: (source: File | Blob | string) => void;
  onRetry: () => void;
}

export default function ScanView({ ocrState, onImage, onRetry }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState<"idle" | "ready" | "denied" | "error">("idle");
  const [askUpload, setAskUpload] = useState(false);

  useEffect(() => {
    if (ocrState !== "idle") return;
    let cancelled = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamera("error");
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
        setCamera("ready");
      } catch (err) {
        const name = (err as { name?: string })?.name ?? "";
        setCamera(name === "NotAllowedError" || name === "PermissionDeniedError" ? "denied" : "error");
      }
    };

    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [ocrState]);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const handleShutter = () => {
    const video = videoRef.current;
    const reticle = reticleRef.current;
    if (!video || video.videoWidth === 0) return;

    // Only read the reticle box (§ "OCR only from the bounding box"). Fall back to
    // the full frame if the crop can't be computed for any reason.
    let dataUrl: string | null = null;
    if (reticle) {
      dataUrl = cropVideoToRect(video, reticle.getBoundingClientRect());
    }
    if (!dataUrl) {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);
      dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    }
    stopStream();
    onImage(dataUrl);
  };

  // Explicit consent before opening the OS file picker (§ upload permission).
  const confirmUpload = () => {
    setAskUpload(false);
    fileRef.current?.click();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    stopStream();
    onImage(file);
  };

  const handleSample = () => {
    stopStream();
    // The sample runs the REAL OCR pipeline too — the pipeline is the demo (§5-A).
    onImage("/sample-menu.jpg");
  };

  if (ocrState === "loading") return <LoadingOverlay />;

  return (
    <div className="absolute inset-0">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="h-full w-full bg-neutral-900 object-cover"
      />

      {camera !== "ready" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/85 px-6 text-center">
          {camera === "idle" && (
            <>
              <div className="mb-4 h-12 w-12 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <p className="text-sm text-white/80">Requesting camera…</p>
            </>
          )}
          {camera === "denied" && (
            <>
              <p className="text-base font-semibold">Camera access blocked</p>
              <p className="mt-2 max-w-[260px] text-xs text-white/70">
                Allow camera permission in your browser settings, or upload a photo of the menu
                board instead.
              </p>
            </>
          )}
          {camera === "error" && (
            <>
              <p className="text-base font-semibold">Camera unavailable</p>
              <p className="mt-2 max-w-[260px] text-xs text-white/70">
                No problem — upload a photo of the menu board or try the sample below.
              </p>
            </>
          )}
        </div>
      )}

      {/* OCR failure banner — retry guidance, never a dead end */}
      {ocrState === "error" && (
        <div className="absolute inset-x-4 top-24 z-30 rounded-2xl bg-red-500/90 p-4 text-center backdrop-blur-sm">
          <p className="text-sm font-semibold">Couldn't read this board</p>
          <p className="mt-1 text-xs text-white/90">Try a straight-on, well-lit shot.</p>
          <button
            onClick={onRetry}
            className="mt-3 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-red-600"
          >
            Try again
          </button>
        </div>
      )}

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 pt-10 text-xs font-medium text-white/90">
        <span className="tracking-widest">장보기 JANGBOGI</span>
        <span className="rounded-full bg-black/40 px-2 py-1 backdrop-blur-sm">KO → EN</span>
      </div>

      {/* Reticle — this box IS the OCR capture region (§ crop to bounding box) */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div ref={reticleRef} className="relative h-40 w-64">
          <Corner className="left-0 top-0" />
          <Corner className="right-0 top-0 rotate-90" />
          <Corner className="bottom-0 right-0 rotate-180" />
          <Corner className="bottom-0 left-0 -rotate-90" />
        </div>
      </div>

      <p className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 translate-y-28 rounded-full bg-black/40 px-3 py-1.5 text-xs text-white/80 backdrop-blur-sm">
        Point at a menu board
      </p>

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-4 pb-8">
        <button
          onClick={handleShutter}
          disabled={camera !== "ready"}
          aria-label="Scan a menu board"
          className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/40 bg-white/95 shadow-lg transition-transform active:scale-95 disabled:opacity-40"
        >
          <span className="h-14 w-14 rounded-full bg-white ring-2 ring-black/10" />
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAskUpload(true)}
            className="rounded-full bg-white/15 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm active:scale-95"
          >
            📷 Upload photo
          </button>
          <button
            onClick={handleSample}
            className="rounded-full bg-emerald-500/90 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm active:scale-95"
          >
            ✨ Try a sample
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      {/* Explicit upload-permission dialog */}
      {askUpload && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 px-6">
          <div className="w-full max-w-[300px] rounded-2xl bg-white p-5 text-center text-neutral-900">
            <p className="text-2xl">🖼️</p>
            <p className="mt-2 text-base font-semibold">Access a photo?</p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-500">
              Allow Jangbogi to open one photo from your device. We only read the menu text in it —
              the image never leaves your phone except to recognize the menu.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setAskUpload(false)}
                className="flex-1 rounded-full bg-neutral-100 py-2.5 text-sm font-medium text-neutral-600 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={confirmUpload}
                className="flex-1 rounded-full bg-emerald-500 py-2.5 text-sm font-semibold text-white active:scale-95"
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

function Corner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`absolute h-8 w-8 rounded-tl-lg border-l-[3px] border-t-[3px] border-white ${className}`}
    />
  );
}

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-neutral-900">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-400/10 to-transparent" />
      <div className="animate-scan absolute inset-x-8 top-[38%] h-1 bg-emerald-400 shadow-[0_0_20px_4px_rgba(52,211,153,0.7)]" />
      <div className="absolute inset-x-0 bottom-24 text-center">
        <p className="text-sm font-medium tracking-wide text-white/90">Reading the board…</p>
        <p className="mt-1 text-xs text-white/60">This takes a few seconds</p>
        <div className="mt-3 flex justify-center gap-1.5">
          {["0s", "0.15s", "0.3s"].map((d) => (
            <span
              key={d}
              className="animate-dot inline-block h-2 w-2 rounded-full bg-white"
              style={{ animationDelay: d }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
