// null = the voice list hasn't loaded yet, so we don't know.
let koreanVoiceAvailable: boolean | null = null;
const listeners = new Set<() => void>();

function evaluate(): boolean | null {
  if (typeof speechSynthesis === "undefined") return false;
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null; // still loading
  return voices.some((v) => v.lang?.toLowerCase().startsWith("ko"));
}

// The voice list arrives asynchronously and keeps changing afterwards (Chrome's
// remote voices, OS voice downloads). Without this listener the first empty
// getVoices() reading was never revisited and 🔊 stayed disabled forever.
if (typeof speechSynthesis !== "undefined") {
  speechSynthesis.addEventListener?.("voiceschanged", () => {
    const next = evaluate();
    if (next === null || next === koreanVoiceAvailable) return;
    koreanVoiceAvailable = next;
    listeners.forEach((notify) => notify());
  });
}

/** true when the device has a ko-KR voice. Optimistic until the list loads. */
export function hasKoreanVoice(): boolean {
  if (koreanVoiceAvailable === null) koreanVoiceAvailable = evaluate();
  return koreanVoiceAvailable ?? true;
}

/** Subscribe to voice-availability changes — pair with `hasKoreanVoice` in a component. */
export function subscribeVoices(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/**
 * Speak Korean text via Web Speech API.
 * cancel() first so rapid taps never overlap (§9).
 * iOS Safari requires the first utterance inside a user gesture —
 * always call this from an onClick handler.
 */
export function speak(text: string): void {
  if (typeof speechSynthesis === "undefined") return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ko-KR";
  u.rate = 0.85;
  const ko = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith("ko"));
  if (ko) u.voice = ko;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}
