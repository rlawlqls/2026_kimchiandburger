let koreanVoiceChecked = false;
let koreanVoiceAvailable = true;

/** true when the device has a ko-KR voice (checked lazily — voices load async). */
export function hasKoreanVoice(): boolean {
  if (typeof speechSynthesis === "undefined") return false;
  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) {
    koreanVoiceChecked = true;
    koreanVoiceAvailable = voices.some((v) => v.lang?.toLowerCase().startsWith("ko"));
  }
  // Before the voice list loads, stay optimistic so 🔊 is not wrongly disabled.
  return koreanVoiceChecked ? koreanVoiceAvailable : true;
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
