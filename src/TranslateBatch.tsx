import { useState, useRef } from "react";
import { LanguageSelector } from "./LanguageSelector";
import { DEFAULT_FROM, DEFAULT_TO } from "./languages";
import { TtsButton } from "./TtsButton";
import { CopyButton } from "./CopyButton";

type InputMode = "manual" | "array";

interface BatchResultItem {
  original: string;
  translated: string;
}

// Parse JSON array string → string[], kembalikan error jika gagal
function parseArrayInput(raw: string): { items: string[]; error: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) return { items: [], error: null };
  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) return { items: [], error: "Input bukan array. Contoh: [\"teks1\", \"teks2\"]" };
    const strings = parsed.filter(v => typeof v === "string" && v.trim());
    if (strings.length === 0) return { items: [], error: "Array tidak memiliki string yang valid." };
    return { items: strings, error: null };
  } catch {
    return { items: [], error: "Format JSON tidak valid." };
  }
}

export function TranslateBatch() {
  const [fromLang, setFromLang] = useState(DEFAULT_FROM);
  const [toLang, setToLang]     = useState(DEFAULT_TO);
  const [inputMode, setInputMode] = useState<InputMode>("manual");

  // Mode manual
  const [items, setItems] = useState<string[]>(["", "", ""]);

  // Mode array
  const [arrayRaw, setArrayRaw]     = useState("");
  const [arrayParseErr, setArrayParseErr] = useState<string | null>(null);

  const [results, setResults] = useState<BatchResultItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [copiedArray, setCopiedArray] = useState(false);
  const copyArrayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleCopyArray(jsonStr: string) {
    try {
      await navigator.clipboard.writeText(jsonStr);
    } catch {
      const el = document.createElement("textarea");
      el.value = jsonStr;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedArray(true);
    if (copyArrayTimerRef.current) clearTimeout(copyArrayTimerRef.current);
    copyArrayTimerRef.current = setTimeout(() => setCopiedArray(false), 2000);
  }

  function handleFromChange(code: string) { setFromLang(code); setResults(null); }
  function handleToChange(code: string)   { setToLang(code);   setResults(null); }

  // ── Manual mode helpers ─────────────────────────────────────────────────
  function updateItem(index: number, value: string) {
    setItems(prev => prev.map((item, i) => (i === index ? value : item)));
  }
  function addItem()              { setItems(prev => [...prev, ""]); }
  function removeItem(idx: number){ setItems(prev => prev.filter((_, i) => i !== idx)); setResults(null); }

  // ── Array mode helpers ──────────────────────────────────────────────────
  function handleArrayChange(val: string) {
    setArrayRaw(val);
    setArrayParseErr(null);
    setResults(null);
  }

  function handleFormatArray() {
    const { items: parsed, error: err } = parseArrayInput(arrayRaw);
    if (err) { setArrayParseErr(err); return; }
    if (parsed.length === 0) return;
    setArrayRaw(JSON.stringify(parsed, null, 2));
  }

  function switchMode(mode: InputMode) {
    setInputMode(mode);
    setResults(null);
    setError(null);
    setArrayParseErr(null);

    // Saat switch ke array, sync isi manual → JSON
    if (mode === "array") {
      const valid = items.map(t => t.trim()).filter(Boolean);
      if (valid.length > 0) setArrayRaw(JSON.stringify(valid, null, 2));
    }
    // Saat switch ke manual, sync JSON → baris
    if (mode === "manual") {
      const { items: parsed } = parseArrayInput(arrayRaw);
      if (parsed.length > 0) setItems(parsed);
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleTranslate() {
    let texts: string[];

    if (inputMode === "manual") {
      texts = items.map(t => t.trim()).filter(Boolean);
    } else {
      const { items: parsed, error: parseErr } = parseArrayInput(arrayRaw);
      if (parseErr) { setArrayParseErr(parseErr); return; }
      texts = parsed;
    }

    if (texts.length === 0) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch("/api/translate/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts, from: fromLang, to: toLang }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Terjadi kesalahan."); return; }
      setResults(data as BatchResultItem[]);
    } catch {
      setError("Gagal menghubungi server.");
    } finally {
      setLoading(false);
    }
  }

  const manualValidCount = items.filter(t => t.trim()).length;
  const { items: arrayParsed } = parseArrayInput(arrayRaw);
  const arrayValidCount = arrayParsed.length;
  const validCount = inputMode === "manual" ? manualValidCount : arrayValidCount;
  const canSpeakFrom = fromLang !== "auto";

  return (
    <div className="feature-panel">
      <div className="feature-description">
        <p>
          Terjemahkan beberapa teks sekaligus dalam satu request. Masukkan teks
          secara manual per baris, atau paste langsung sebagai JSON array.
        </p>
      </div>

      <LanguageSelector
        fromLang={fromLang}
        toLang={toLang}
        onFromChange={handleFromChange}
        onToChange={handleToChange}
      />

      {/* Mode toggle */}
      <div className="input-mode-toggle" role="group" aria-label="Mode input">
        <button
          className={`mode-btn${inputMode === "manual" ? " mode-btn--active" : ""}`}
          onClick={() => switchMode("manual")}
        >
          ✏️ Manual
        </button>
        <button
          className={`mode-btn${inputMode === "array" ? " mode-btn--active" : ""}`}
          onClick={() => switchMode("array")}
        >
          {"[ ]"} JSON Array
        </button>
      </div>

      {/* Manual input */}
      {inputMode === "manual" && (
        <div className="batch-inputs">
          {items.map((item, index) => (
            <div key={index} className="batch-input-row">
              <span className="batch-index">{index + 1}</span>
              <input
                className="batch-input"
                type="text"
                placeholder={`Teks ke-${index + 1}...`}
                value={item}
                onChange={e => updateItem(index, e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleTranslate(); }}
              />
              {items.length > 1 && (
                <button
                  className="remove-btn"
                  onClick={() => removeItem(index)}
                  title="Hapus baris"
                  aria-label={`Hapus baris ${index + 1}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <div className="batch-actions">
            <button className="add-btn" onClick={addItem}>+ Tambah Baris</button>
            <button
              className="translate-button"
              onClick={handleTranslate}
              disabled={loading || validCount === 0}
            >
              {loading ? "Menerjemahkan..." : `Terjemahkan (${validCount})`}
            </button>
          </div>
        </div>
      )}

      {/* Array JSON input */}
      {inputMode === "array" && (
        <div className="raw-input-wrap">
          <div className="raw-input-header">
            <span className="raw-input-hint">
              Format: <code>["teks1", "teks2", ...]</code>
            </span>
            <button className="format-btn" onClick={handleFormatArray} title="Prettify JSON">
              ⟳ Format
            </button>
          </div>
          <textarea
            className="raw-textarea"
            placeholder={'["Halo dunia", "Apa kabar", "Selamat pagi"]'}
            value={arrayRaw}
            onChange={e => handleArrayChange(e.target.value)}
            rows={6}
            spellCheck={false}
          />
          {arrayParseErr && <p className="raw-parse-error">⚠️ {arrayParseErr}</p>}
          {!arrayParseErr && arrayValidCount > 0 && (
            <p className="raw-parse-ok">✓ {arrayValidCount} item siap diterjemahkan</p>
          )}
          <div className="batch-actions">
            <span />
            <button
              className="translate-button"
              onClick={handleTranslate}
              disabled={loading || validCount === 0 || !!arrayParseErr}
            >
              {loading ? "Menerjemahkan..." : `Terjemahkan (${validCount})`}
            </button>
          </div>
        </div>
      )}

      {error && <p className="translator-error">⚠️ {error}</p>}

      {results && (
        <div className="batch-results">
          <h3 className="results-title">Hasil Terjemahan</h3>
          <div className="batch-result-list">
            {results.map((item, i) => (
              <div key={i} className="batch-result-item">
                <div className="result-original">
                  <span className="result-lang-badge">{fromLang.toUpperCase()}</span>
                  <span className="result-text">{item.original}</span>
                  <CopyButton text={item.original} />
                  <TtsButton
                    text={item.original}
                    lang={fromLang === "auto" ? "id" : fromLang}
                    disabled={!canSpeakFrom}
                  />
                </div>
                <div className="result-arrow">→</div>
                <div className="result-translated">
                  <span className="result-lang-badge ja">{toLang.toUpperCase()}</span>
                  <span className="result-text">{item.translated}</span>
                  <CopyButton text={item.translated} />
                  <TtsButton text={item.translated} lang={toLang} />
                </div>
              </div>
            ))}
          </div>

          {/* Hasil sebagai JSON array */}
          {(() => {
            const arrayStr = JSON.stringify(results.map(r => r.translated), null, 2);
            return (
              <details className="json-preview">
                <summary>Lihat sebagai Array</summary>
                <div className="json-output-wrap">
                  <button
                    className={`json-copy-btn${copiedArray ? " json-copy-btn--copied" : ""}`}
                    onClick={() => handleCopyArray(arrayStr)}
                    aria-label="Salin array"
                    title="Salin array ke clipboard"
                  >
                    {copiedArray ? "✓ Tersalin!" : "⎘ Salin"}
                  </button>
                  <pre className="json-output">{arrayStr}</pre>
                </div>
              </details>
            );
          })()}
        </div>
      )}
    </div>
  );
}
