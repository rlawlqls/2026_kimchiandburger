import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import marketBooth from "@/assets/market-booth.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MarketLens — Korean Market OCR & Translation" },
      {
        name: "description",
        content:
          "Point your camera at a Korean market booth and instantly translate signs, hear pronunciations, and get useful phrases to order.",
      },
      { property: "og:title", content: "MarketLens — Korean Market OCR" },
      {
        property: "og:description",
        content:
          "Camera-based Korean menu translation for foreign visitors to traditional markets.",
      },
    ],
  }),
  component: Index,
});

type Stage = "camera" | "scanning" | "detected" | "phrase";

type Phrase = {
  en: string;
  ko: string;
  romaji: string;
  syllables: { ko: string; ro: string }[];
};

const PHRASES: Phrase[] = [
  {
    en: "Can I order one?",
    ko: "하나 주세요",
    romaji: "ha-na ju-se-yo",
    syllables: [
      { ko: "하", ro: "ha" },
      { ko: "나", ro: "na" },
      { ko: "주", ro: "ju" },
      { ko: "세", ro: "se" },
      { ko: "요", ro: "yo" },
    ],
  },
  {
    en: "How much does it cost?",
    ko: "얼마예요?",
    romaji: "eol-ma-ye-yo",
    syllables: [
      { ko: "얼", ro: "eol" },
      { ko: "마", ro: "ma" },
      { ko: "예", ro: "ye" },
      { ko: "요", ro: "yo" },
    ],
  },
  {
    en: "Is there garlic in this?",
    ko: "이거 마늘 들어 있어요?",
    romaji: "i-geo ma-neul deu-reo i-sseo-yo",
    syllables: [
      { ko: "이", ro: "i" },
      { ko: "거", ro: "geo" },
      { ko: "마", ro: "ma" },
      { ko: "늘", ro: "neul" },
      { ko: "들", ro: "deu" },
      { ko: "어", ro: "reo" },
      { ko: "있", ro: "i" },
      { ko: "어", ro: "sseo" },
      { ko: "요", ro: "yo" },
    ],
  },
];

function Index() {
  const [stage, setStage] = useState<Stage>("camera");
  const [phrase, setPhrase] = useState<Phrase | null>(null);

  const startScan = () => {
    setStage("scanning");
    setTimeout(() => setStage("detected"), 1800);
  };

  const reset = () => {
    setPhrase(null);
    setStage("camera");
  };

  return (
    <main className="min-h-screen bg-neutral-100 flex items-center justify-center p-4 sm:p-8">
      {/* Phone frame */}
      <div className="relative w-full max-w-[400px] aspect-[9/19.5] bg-black rounded-[3rem] shadow-2xl overflow-hidden border-[10px] border-neutral-900">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-30" />

        <div className="relative w-full h-full bg-black text-white overflow-hidden">
          {stage === "camera" && <CameraView onScan={startScan} />}
          {stage === "scanning" && <ScanningView />}
          {stage === "detected" && (
            <DetectedView
              onPickPhrase={(p) => {
                setPhrase(p);
                setStage("phrase");
              }}
              onBack={reset}
            />
          )}
          {stage === "phrase" && phrase && (
            <PhraseView phrase={phrase} onBack={() => setStage("detected")} />
          )}
        </div>
      </div>
    </main>
  );
}

/* ---------- Camera ---------- */

function CameraView({ onScan }: { onScan: () => void }) {
  return (
    <div className="absolute inset-0">
      <img
        src={marketBooth}
        alt="Market booth viewfinder"
        className="w-full h-full object-cover"
      />
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 pt-10 px-5 flex items-center justify-between text-white/90 text-xs font-medium z-20">
        <span className="tracking-widest">MARKETLENS</span>
        <span className="px-2 py-1 rounded-full bg-black/40 backdrop-blur-sm">
          KO → EN
        </span>
      </div>

      {/* Reticle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-64 h-40 relative">
          <Corner className="top-0 left-0" />
          <Corner className="top-0 right-0 rotate-90" />
          <Corner className="bottom-0 right-0 rotate-180" />
          <Corner className="bottom-0 left-0 -rotate-90" />
        </div>
      </div>

      <p className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-28 text-xs text-white/80 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full">
        Point at Korean text
      </p>

      {/* Shutter */}
      <div className="absolute bottom-0 inset-x-0 pb-10 flex items-center justify-center z-20">
        <button
          onClick={onScan}
          aria-label="Scan"
          className="w-20 h-20 rounded-full bg-white/95 border-4 border-white/40 shadow-lg active:scale-95 transition-transform flex items-center justify-center"
        >
          <span className="w-14 h-14 rounded-full bg-white ring-2 ring-black/10" />
        </button>
      </div>
    </div>
  );
}

function Corner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`absolute w-8 h-8 border-l-[3px] border-t-[3px] border-white rounded-tl-lg ${className}`}
    />
  );
}

/* ---------- Scanning ---------- */

function ScanningView() {
  return (
    <div className="absolute inset-0">
      <img
        src={marketBooth}
        alt=""
        className="w-full h-full object-cover brightness-75"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-400/10 to-transparent" />
      <div className="absolute inset-x-8 top-[38%] h-1 bg-emerald-400 shadow-[0_0_20px_4px_rgba(52,211,153,0.7)] animate-scan" />
      <div className="absolute bottom-24 inset-x-0 text-center">
        <p className="text-white/90 text-sm font-medium tracking-wide">
          Recognizing Korean text…
        </p>
        <div className="mt-3 flex justify-center gap-1.5">
          <Dot delay="0s" />
          <Dot delay="0.15s" />
          <Dot delay="0.3s" />
        </div>
      </div>
      <style>{`
        @keyframes scanMove {
          0% { transform: translateY(-80px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(160px); opacity: 0; }
        }
        .animate-scan { animation: scanMove 1.6s ease-in-out infinite; }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="w-2 h-2 rounded-full bg-white inline-block"
      style={{ animation: `dotBounce 1s ease-in-out ${delay} infinite` }}
    />
  );
}

/* ---------- Detected ---------- */

function DetectedView({
  onPickPhrase,
  onBack,
}: {
  onPickPhrase: (p: Phrase) => void;
  onBack: () => void;
}) {
  const [reveal, setReveal] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReveal(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Top: shrunken image preview with highlighted OCR */}
      <div className="relative h-[38%] flex-shrink-0">
        <img src={marketBooth} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/30" />
        {/* OCR bounding box */}
        <div
          className={`absolute left-[10%] right-[10%] top-[10%] h-[22%] border-2 border-emerald-400 rounded-md transition-opacity ${reveal ? "opacity-100" : "opacity-0"}`}
        >
          <span className="absolute -top-6 left-0 text-[10px] font-semibold text-emerald-300 bg-black/70 px-2 py-0.5 rounded">
            DETECTED · 99%
          </span>
        </div>
        <button
          onClick={onBack}
          className="absolute top-10 left-4 text-white/90 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 text-xs"
        >
          ← Rescan
        </button>
      </div>

      {/* Sheet */}
      <div className="flex-1 bg-white text-neutral-900 rounded-t-3xl -mt-6 relative shadow-2xl overflow-y-auto">
        <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto mt-2" />
        <div className="px-6 pt-4 pb-6">
          <p className="text-[11px] font-semibold text-emerald-600 tracking-widest">
            KOREAN · DETECTED
          </p>
          <h1 className="mt-1 text-4xl font-bold tracking-tight">떡볶이</h1>
          <p className="mt-1 text-neutral-500 text-sm italic">
            tteok-bokki · 떡·볶·이
          </p>

          <div className="mt-4 rounded-2xl bg-neutral-100 p-4">
            <p className="text-[11px] font-semibold text-neutral-500 tracking-wider">
              MEANING
            </p>
            <p className="mt-1 text-lg font-semibold">Spicy Rice Cakes</p>
            <p className="text-sm text-neutral-600 mt-1 leading-relaxed">
              Chewy cylindrical rice cakes simmered in a sweet-and-spicy
              gochujang sauce. A staple Korean street-food dish.
            </p>
          </div>

          <div className="mt-5">
            <p className="text-[11px] font-semibold text-neutral-500 tracking-wider">
              SUGGESTED PHRASES
            </p>
            <div className="mt-2 space-y-2">
              {PHRASES.map((p) => (
                <button
                  key={p.en}
                  onClick={() => onPickPhrase(p)}
                  className="w-full text-left flex items-center justify-between gap-3 p-3.5 rounded-xl border border-neutral-200 hover:border-emerald-500 hover:bg-emerald-50 active:scale-[0.99] transition"
                >
                  <span className="text-sm font-medium">{p.en}</span>
                  <span className="text-emerald-600 text-lg leading-none">›</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Phrase ---------- */

function PhraseView({
  phrase,
  onBack,
}: {
  phrase: Phrase;
  onBack: () => void;
}) {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-emerald-600 to-emerald-800 text-white flex flex-col">
      <div className="pt-12 px-5 flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-white/90 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1 text-xs"
        >
          ← Back
        </button>
        <span className="text-[11px] tracking-widest text-white/70">
          SAY THIS
        </span>
        <span className="w-14" />
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 pb-16">
        <p className="text-sm text-white/70 uppercase tracking-widest">
          English
        </p>
        <p className="mt-1 text-xl font-medium">{phrase.en}</p>

        <div className="mt-10">
          <p className="text-sm text-white/70 uppercase tracking-widest">
            Korean
          </p>
          <p className="mt-2 text-5xl font-bold leading-tight">{phrase.ko}</p>
        </div>

        <div className="mt-8">
          <p className="text-sm text-white/70 uppercase tracking-widest">
            Pronounce
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-wide">
            {phrase.romaji}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {phrase.syllables.map((s, i) => (
              <div
                key={i}
                className="rounded-xl bg-white/15 backdrop-blur-sm px-3 py-2 text-center min-w-[52px]"
              >
                <div className="text-lg font-bold">{s.ko}</div>
                <div className="text-[11px] text-white/80 mt-0.5">{s.ro}</div>
              </div>
            ))}
          </div>
        </div>

        <button className="mt-10 w-full py-4 rounded-2xl bg-white text-emerald-700 font-semibold shadow-lg active:scale-[0.99] transition">
          🔊  Play pronunciation
        </button>
        <p className="mt-3 text-center text-xs text-white/70">
          Show this screen to the vendor
        </p>
      </div>
    </div>
  );
}
