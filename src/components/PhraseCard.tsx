import { useSyncExternalStore } from "react";
import type { Phrase } from "../types";
import { hasKoreanVoice, speak, subscribeVoices } from "../utils/speak";

export default function PhraseCard({ phrase }: { phrase: Phrase }) {
  const voiceOk = useSyncExternalStore(subscribeVoices, hasKoreanVoice, hasKoreanVoice);
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-bold text-neutral-900">{phrase.ko}</p>
        <button
          onClick={() => speak(phrase.ko)}
          disabled={!voiceOk}
          aria-label={`Play pronunciation: ${phrase.ko}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-lg text-emerald-700 active:scale-90 disabled:opacity-40"
        >
          🔊
        </button>
      </div>
      <p className="mt-1 text-sm italic text-emerald-700">{phrase.roman}</p>
      <p className="mt-0.5 text-sm text-neutral-500">{phrase.en}</p>
      {!voiceOk && <p className="mt-1 text-[10px] text-neutral-400">Audio unavailable on this device</p>}
    </div>
  );
}
