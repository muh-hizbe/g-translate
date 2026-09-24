import { useState, useRef } from "react";

interface CopyButtonProps {
  text: string;
  disabled?: boolean;
  /** Durasi feedback "tersalin" dalam ms, default 2000 */
  feedbackMs?: number;
}

export function CopyButton({ text, disabled, feedbackMs = 2000 }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleCopy() {
    if (!text || disabled) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback untuk browser tanpa Clipboard API
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), feedbackMs);
  }

  return (
    <button
      className={`copy-btn${copied ? " copy-btn--copied" : ""}`}
      onClick={handleCopy}
      disabled={disabled || !text}
      title={copied ? "Tersalin!" : "Salin teks"}
      aria-label={copied ? "Tersalin!" : "Salin teks"}
    >
      {copied ? "✓" : "⎘"}
    </button>
  );
}
