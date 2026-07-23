import { useEffect, useRef, useState } from "react";
import type { MenuItem, UserProfile } from "../types";
import { speak } from "../utils/speak";
import { suggestReply, VENDOR_QUESTIONS } from "../utils/vendorReplies";

// Minimal Web Speech API typing (no lib.dom SpeechRecognition in TS by default).
interface SpeechRec {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecCtor = new () => SpeechRec;

function getRecognitionCtor(): SpeechRecCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecCtor;
    webkitSpeechRecognition?: SpeechRecCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface Bubble {
  side: "them" | "you";
  ko: string;
  sub?: string;
}

// "Listen to vendor" — the vendor speaks (mic or a quick button) and we suggest a
// reply, personalised with the dish, quantity and the user's profile (mockup §듣기).
export default function ListenSheet({
  menu,
  qty,
  profile,
  onClose,
  onToast,
}: {
  menu: MenuItem | null;
  qty: number;
  profile: UserProfile;
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  const [on, setOn] = useState(false);
  const [listening, setListening] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([
    { side: "them", ko: "Tap the mic when the vendor speaks to you", sub: "Or use the quick buttons below" },
  ]);
  const recRef = useRef<SpeechRec | null>(null);

  useEffect(() => {
    const r = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(r);
  }, []);

  const stopRec = () => {
    if (recRef.current) {
      try {
        recRef.current.stop();
      } catch {
        /* already stopped */
      }
      recRef.current = null;
    }
    setListening(false);
  };

  useEffect(() => () => stopRec(), []);

  const close = () => {
    stopRec();
    setOn(false);
    setTimeout(onClose, 300);
  };

  // Keep only the last 4 bubbles, like the mockup.
  const push = (b: Bubble) => setBubbles((prev) => [...prev, b].slice(-4));

  const handle = (text: string) => {
    push({ side: "them", ko: text, sub: "Vendor" });
    const reply = suggestReply(text, {
      menu,
      qty,
      spiceTolerance: profile.spiceTolerance,
      allergies: profile.allergies,
    });
    setTimeout(() => {
      push({ side: "you", ko: reply.ko, sub: `${reply.en} · ${reply.note}` });
      speak(reply.ko);
    }, 380);
  };

  const toggleListen = () => {
    if (listening) {
      stopRec();
      return;
    }
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      onToast("Speech input not supported — use the buttons");
      return;
    }
    const rec = new Ctor();
    rec.lang = "ko-KR";
    rec.interimResults = false;
    rec.onresult = (e) => handle(e.results[0][0].transcript);
    rec.onerror = () => {
      onToast("Didn't catch that");
      stopRec();
    };
    rec.onend = () => stopRec();
    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch {
      stopRec();
    }
  };

  return (
    <>
      <div className={`scrim ${on ? "on" : ""}`} onClick={close} />
      <div className={`sheet ${on ? "on" : ""}`} role="dialog" aria-modal="true">
        <div className="handle" />
        <div className="sbody">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-[21px] font-black leading-[1.15] tracking-[-0.02em]">
                Listen &amp; reply
              </h1>
              <p className="mt-[3px] text-[11.5px] text-[var(--ink2)]">
                The vendor speaks — we suggest your answer
              </p>
            </div>
          </div>

          {/* chat */}
          <div className="flex h-[190px] flex-col justify-end gap-[7px] overflow-hidden">
            {bubbles.map((b, i) => (
              <div
                key={i}
                className={`max-w-[86%] rounded-[14px] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  b.side === "them"
                    ? "self-start rounded-bl-[4px] bg-[var(--bg2)]"
                    : "self-end rounded-br-[4px] bg-[var(--jade)] text-white"
                }`}
              >
                {b.ko}
                {b.sub && <div className="mt-1 text-[11px] opacity-70">{b.sub}</div>}
              </div>
            ))}
          </div>

          {/* mic */}
          <button
            onClick={toggleListen}
            aria-label="Listen to the vendor"
            className={`mx-auto flex h-[76px] w-[76px] items-center justify-center rounded-full bg-[var(--gochu)] text-[29px] text-white shadow-[0_8px_24px_rgba(239,68,68,0.35)] ${
              listening ? "animate-mic-pulse" : ""
            }`}
          >
            🎤
          </button>
          <p className="text-center text-xs text-[var(--ink2)]">
            {listening ? "Listening…" : "Tap, then let the vendor speak"}
          </p>

          {/* quick questions */}
          <div className="flex flex-wrap justify-center gap-1.5">
            {VENDOR_QUESTIONS.map((q) => (
              <button
                key={q.ko}
                onClick={() => handle(q.ko)}
                className="flex flex-col items-center rounded-[14px] border border-[var(--line)] bg-white px-3 py-[7px] text-[11.5px] font-semibold leading-tight"
              >
                {q.en}
                <span className="text-[9.5px] font-medium opacity-50">{q.ko}</span>
              </button>
            ))}
          </div>

          <button
            onClick={close}
            className="rounded-[14px] border border-[var(--line)] bg-white py-3.5 text-[15px] font-bold text-[var(--ink)] active:scale-[0.975]"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
