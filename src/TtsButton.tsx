import { useAudioPlayer } from "./useAudioPlayer";

interface TtsButtonProps {
  text: string;
  lang: string;
  disabled?: boolean;
}

export function TtsButton({ text, lang, disabled }: TtsButtonProps) {
  const { state, error, play } = useAudioPlayer();

  const isLoading = state === "loading";
  const isPlaying = state === "playing";
  const isError   = state === "error";

  let icon  = "▶";
  let title = "Putar audio";
  if (isLoading) { icon = "⏳"; title = "Memuat audio..."; }
  if (isPlaying) { icon = "⏹"; title = "Stop audio"; }
  if (isError)   { icon = "⚠"; title = error ?? "Gagal memutar audio"; }

  return (
    <button
      className={`tts-btn${isPlaying ? " tts-btn--playing" : ""}${isError ? " tts-btn--error" : ""}`}
      onClick={() => play(text, lang)}
      disabled={disabled || isLoading}
      title={title}
      aria-label={title}
    >
      <span className={`tts-icon${isLoading ? " tts-icon--spin" : ""}`}>{icon}</span>
    </button>
  );
}
