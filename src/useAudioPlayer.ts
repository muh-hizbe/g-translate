import { useState, useRef, useEffect } from "react";

type PlayState = "idle" | "loading" | "playing" | "error";

export function useAudioPlayer() {
  const [state, setState]       = useState<PlayState>("idle");
  const [error, setError]       = useState<string | null>(null);
  const audioRef                = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef            = useRef<string | null>(null);
  // Flag untuk membedakan error dari cleanup vs error playback sungguhan
  const cleaningUpRef           = useRef(false);

  useEffect(() => {
    return () => {
      stopAndClean();
    };
  }, []);

  function stopAndClean() {
    cleaningUpRef.current = true;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";   // <-- ini trigger onerror, harus di-guard
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    // Reset flag setelah microtask — beri waktu onerror selesai dulu
    Promise.resolve().then(() => {
      cleaningUpRef.current = false;
    });
  }

  async function play(text: string, lang: string) {
    if (state === "playing") {
      stopAndClean();
      setState("idle");
      return;
    }

    stopAndClean();
    setState("loading");
    setError(null);

    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Gagal mengambil audio.");
        setState("error");
        return;
      }

      // Decode Base64 → Uint8Array → Blob → Object URL
      const binary = atob(data.audio as string);
      const bytes  = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "audio/mpeg" });
      const url  = URL.createObjectURL(blob);
      objectUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        // Audio selesai secara normal — cleanup tanpa set error
        cleaningUpRef.current = true;
        audioRef.current = null;
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        setState("idle");
        Promise.resolve().then(() => {
          cleaningUpRef.current = false;
        });
      };

      audio.onerror = () => {
        // Abaikan error yang datang dari proses cleanup (src = "")
        if (cleaningUpRef.current) return;
        setError("Gagal memutar audio.");
        setState("error");
      };

      await audio.play();
      setState("playing");
    } catch {
      setError("Gagal menghubungi server.");
      setState("error");
    }
  }

  function stop() {
    stopAndClean();
    setState("idle");
  }

  return { state, error, play, stop };
}
