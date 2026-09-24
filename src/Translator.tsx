import { useState } from "react";
import { LanguageSelector } from "./LanguageSelector";
import { DEFAULT_FROM, DEFAULT_TO, LANGUAGES } from "./languages";
import { TtsButton } from "./TtsButton";
import { CopyButton } from "./CopyButton";

interface TranslateResult {
  original: string;
  translated: string;
  from: string;
  to: string;
}

function getLangName(code: string) {
  return LANGUAGES.find(l => l.code === code)?.name ?? code;
}

// ── Translator ───────────────────────────────────────────────────────────────

export function Translator() {
  const [fromLang, setFromLang]   = useState(DEFAULT_FROM);
  const [toLang, setToLang]       = useState(DEFAULT_TO);
  const [inputText, setInputText] = useState("");
  const [result, setResult]       = useState<TranslateResult | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  function handleFromChange(code: string) {
    setFromLang(code);
    setResult(null);
  }

  function handleToChange(code: string) {
    setToLang(code);
    setResult(null);
  }

  async function handleTranslate() {
    if (!inputText.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText, from: fromLang, to: toLang }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Terjadi kesalahan.");
        return;
      }

      setResult(data as TranslateResult);
    } catch {
      setError("Gagal menghubungi server. Pastikan server sudah berjalan.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleTranslate();
    }
  }

  // "auto" tidak bisa di-TTS karena Google butuh kode bahasa yang konkret
  const canSpeakFrom = fromLang !== "auto" && !!inputText.trim();
  const canSpeakTo   = !!result?.translated;

  return (
    <div className="translator">
      <LanguageSelector
        fromLang={fromLang}
        toLang={toLang}
        onFromChange={handleFromChange}
        onToChange={handleToChange}
      />

      <div className="translator-panels">
        {/* Panel Input */}
        <div className="translator-panel">
          <div className="panel-label-row">
            <label className="panel-label">Teks ({getLangName(fromLang)})</label>
            <TtsButton
              text={inputText}
              lang={fromLang === "auto" ? "id" : fromLang}
              disabled={!canSpeakFrom}
            />
          </div>          <textarea
            className="translator-textarea"
            placeholder={`Ketik teks dalam bahasa ${getLangName(fromLang)}...`}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={6}
          />
          <span className="panel-hint">Ctrl+Enter untuk terjemahkan</span>
        </div>

        {/* Panel Output */}
        <div className="translator-panel">
          <div className="panel-label-row">
            <label className="panel-label">Hasil ({getLangName(toLang)})</label>
            <div className="panel-label-actions">
              <CopyButton text={result?.translated ?? ""} disabled={!canSpeakTo} />
              <TtsButton
                text={result?.translated ?? ""}
                lang={toLang}
                disabled={!canSpeakTo}
              />
            </div>
          </div>
          <div className={`translator-output${result ? " has-result" : ""}`}>
            {loading && (
              <span className="translator-loading">⏳ Menerjemahkan...</span>
            )}
            {!loading && error && (
              <span className="translator-error">⚠️ {error}</span>
            )}
            {!loading && result && (
              <span className="translator-result">{result.translated}</span>
            )}
            {!loading && !error && !result && (
              <span className="translator-placeholder">
                Hasil terjemahan akan muncul di sini...
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        className="translate-button"
        onClick={handleTranslate}
        disabled={loading || !inputText.trim()}
      >
        {loading ? "Menerjemahkan..." : "Terjemahkan"}
      </button>
    </div>
  );
}
