import { useState, useRef } from "react";
import { LanguageSelector } from "./LanguageSelector";
import { DEFAULT_FROM, DEFAULT_TO } from "./languages";
import { TtsButton } from "./TtsButton";
import { CopyButton } from "./CopyButton";

type InputMode = "manual" | "json";

interface MapEntry {
  key: string;
  value: string;
}

interface MapResultItem {
  original: string;
  translated: string;
}

// Parse JSON object string → Record<string,string>, kembalikan error jika gagal
function parseJsonInput(raw: string): { map: Record<string, string> | null; error: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) return { map: null, error: null };
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) {
      return { map: null, error: "Input bukan object. Contoh: {\"key\": \"nilai\"}" };
    }
    const valid: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && v.trim()) valid[k] = v;
    }
    if (Object.keys(valid).length === 0) {
      return { map: null, error: "Object tidak memiliki entri string yang valid." };
    }
    return { map: valid, error: null };
  } catch {
    return { map: null, error: "Format JSON tidak valid." };
  }
}

export function TranslateMap() {
  const [fromLang, setFromLang] = useState(DEFAULT_FROM);
  const [toLang, setToLang]     = useState(DEFAULT_TO);
  const [inputMode, setInputMode] = useState<InputMode>("manual");

  // Mode manual
  const [entries, setEntries] = useState<MapEntry[]>([
    { key: "nama", value: "" },
    { key: "keterangan", value: "" },
  ]);

  // Mode JSON
  const [jsonRaw, setJsonRaw]         = useState("");
  const [jsonParseErr, setJsonParseErr] = useState<string | null>(null);

  const [results, setResults] = useState<Record<string, MapResultItem> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);
  const copyTimeoutRef        = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleFromChange(code: string) { setFromLang(code); setResults(null); setCopied(false); }
  function handleToChange(code: string)   { setToLang(code);   setResults(null); setCopied(false); }

  // ── Manual helpers ──────────────────────────────────────────────────────
  function updateEntry(index: number, field: "key" | "value", val: string) {
    setEntries(prev => prev.map((e, i) => (i === index ? { ...e, [field]: val } : e)));
    setResults(null);
  }
  function addEntry()               { setEntries(prev => [...prev, { key: "", value: "" }]); }
  function removeEntry(idx: number) { setEntries(prev => prev.filter((_, i) => i !== idx)); setResults(null); }

  // ── JSON helpers ────────────────────────────────────────────────────────
  function handleJsonChange(val: string) {
    setJsonRaw(val);
    setJsonParseErr(null);
    setResults(null);
  }

  function handleFormatJson() {
    const { map, error: err } = parseJsonInput(jsonRaw);
    if (err) { setJsonParseErr(err); return; }
    if (!map) return;
    setJsonRaw(JSON.stringify(map, null, 2));
  }

  function switchMode(mode: InputMode) {
    setInputMode(mode);
    setResults(null);
    setError(null);
    setJsonParseErr(null);

    // Sync manual → JSON
    if (mode === "json") {
      const valid: Record<string, string> = {};
      for (const e of entries) {
        if (e.key.trim() && e.value.trim()) valid[e.key.trim()] = e.value.trim();
      }
      if (Object.keys(valid).length > 0) setJsonRaw(JSON.stringify(valid, null, 2));
    }
    // Sync JSON → manual
    if (mode === "manual") {
      const { map } = parseJsonInput(jsonRaw);
      if (map) setEntries(Object.entries(map).map(([key, value]) => ({ key, value })));
    }
  }

  // ── Validasi manual ─────────────────────────────────────────────────────
  const keyErrors: Record<number, string> = {};
  const seenKeys = new Set<string>();
  for (let i = 0; i < entries.length; i++) {
    const k = entries[i].key.trim();
    if (!k)            keyErrors[i] = "Key wajib diisi";
    else if (seenKeys.has(k)) keyErrors[i] = "Key duplikat";
    else               seenKeys.add(k);
  }
  const validEntries = entries.filter((e, i) => !keyErrors[i] && e.value.trim());
  const hasErrors    = Object.keys(keyErrors).length > 0;

  const { map: parsedJsonMap } = parseJsonInput(jsonRaw);
  const jsonValidCount = parsedJsonMap ? Object.keys(parsedJsonMap).length : 0;

  // ── Copy helper ─────────────────────────────────────────────────────────
  async function handleCopy(jsonStr: string) {
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
    setCopied(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleTranslate() {
    let map: Record<string, string>;

    if (inputMode === "manual") {
      if (validEntries.length === 0 || hasErrors) return;
      map = Object.fromEntries(validEntries.map(e => [e.key.trim(), e.value.trim()]));
    } else {
      const { map: parsed, error: parseErr } = parseJsonInput(jsonRaw);
      if (parseErr) { setJsonParseErr(parseErr); return; }
      if (!parsed)  return;
      map = parsed;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch("/api/translate/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ map, from: fromLang, to: toLang }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Terjadi kesalahan."); return; }
      setResults(data as Record<string, MapResultItem>);
    } catch {
      setError("Gagal menghubungi server.");
    } finally {
      setLoading(false);
    }
  }

  const translateCount = inputMode === "manual" ? validEntries.length : jsonValidCount;
  const translateDisabled =
    loading ||
    (inputMode === "manual" ? (translateCount === 0 || hasErrors) : (translateCount === 0 || !!jsonParseErr));

  return (
    <div className="feature-panel">
      <div className="feature-description">
        <p>
          Terjemahkan object key-value sekaligus. Masukkan entri secara manual
          atau paste langsung sebagai JSON object.
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
          className={`mode-btn${inputMode === "json" ? " mode-btn--active" : ""}`}
          onClick={() => switchMode("json")}
        >
          {"{ }"} JSON Object
        </button>
      </div>

      {/* Manual input */}
      {inputMode === "manual" && (
        <>
          <div className="map-header">
            <span className="map-col-label">Key</span>
            <span className="map-col-label">Nilai</span>
          </div>

          <div className="map-inputs">
            {entries.map((entry, index) => (
              <div key={index} className="map-input-row">
                <div className="map-key-wrap">
                  <input
                    className={`map-input map-key-input${keyErrors[index] ? " input-error" : ""}`}
                    type="text"
                    placeholder="key"
                    value={entry.key}
                    onChange={e => updateEntry(index, "key", e.target.value)}
                  />
                  {keyErrors[index] && (
                    <span className="input-error-msg">{keyErrors[index]}</span>
                  )}
                </div>
                <input
                  className="map-input map-value-input"
                  type="text"
                  placeholder="Nilai teks..."
                  value={entry.value}
                  onChange={e => updateEntry(index, "value", e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleTranslate(); }}
                />
                {entries.length > 1 && (
                  <button
                    className="remove-btn"
                    onClick={() => removeEntry(index)}
                    title="Hapus baris"
                    aria-label={`Hapus entri ${index + 1}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="batch-actions">
            <button className="add-btn" onClick={addEntry}>+ Tambah Entri</button>
            <button
              className="translate-button"
              onClick={handleTranslate}
              disabled={translateDisabled}
            >
              {loading ? "Menerjemahkan..." : `Terjemahkan (${translateCount})`}
            </button>
          </div>
        </>
      )}

      {/* JSON input */}
      {inputMode === "json" && (
        <div className="raw-input-wrap">
          <div className="raw-input-header">
            <span className="raw-input-hint">
              Format: <code>{"{ \"key\": \"nilai\" }"}</code>
            </span>
            <button className="format-btn" onClick={handleFormatJson} title="Prettify JSON">
              ⟳ Format
            </button>
          </div>
          <textarea
            className="raw-textarea"
            placeholder={'{\n  "greeting": "Halo dunia",\n  "farewell": "Selamat tinggal"\n}'}
            value={jsonRaw}
            onChange={e => handleJsonChange(e.target.value)}
            rows={8}
            spellCheck={false}
          />
          {jsonParseErr && <p className="raw-parse-error">⚠️ {jsonParseErr}</p>}
          {!jsonParseErr && jsonValidCount > 0 && (
            <p className="raw-parse-ok">✓ {jsonValidCount} entri siap diterjemahkan</p>
          )}
          <div className="batch-actions">
            <span />
            <button
              className="translate-button"
              onClick={handleTranslate}
              disabled={translateDisabled}
            >
              {loading ? "Menerjemahkan..." : `Terjemahkan (${translateCount})`}
            </button>
          </div>
        </div>
      )}

      {error && <p className="translator-error">⚠️ {error}</p>}

      {results && (
        <div className="batch-results">
          <h3 className="results-title">Hasil Terjemahan</h3>
          <div className="map-result-table">
            <div className="map-result-header">
              <span>Key</span>
              <span>Original</span>
              <span>Terjemahan ({toLang})</span>
            </div>
            {Object.entries(results).map(([key, item]) => (
              <div key={key} className="map-result-row">
                <span className="map-result-key">{key}</span>
                <div className="map-result-cell">
                  <span className="map-result-original">{item.original}</span>
                  <CopyButton text={item.original} />
                  <TtsButton
                    text={item.original}
                    lang={fromLang === "auto" ? "id" : fromLang}
                  />
                </div>
                <div className="map-result-cell">
                  <span className="map-result-translated">{item.translated}</span>
                  <CopyButton text={item.translated} />
                  <TtsButton text={item.translated} lang={toLang} />
                </div>
              </div>
            ))}
          </div>

          {(() => {
            const jsonStr = JSON.stringify(
              Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.translated])),
              null,
              2
            );
            return (
              <details className="json-preview">
                <summary>Lihat sebagai JSON</summary>
                <div className="json-output-wrap">
                  <button
                    className={`json-copy-btn${copied ? " json-copy-btn--copied" : ""}`}
                    onClick={() => handleCopy(jsonStr)}
                    aria-label="Salin JSON"
                    title="Salin JSON ke clipboard"
                  >
                    {copied ? "✓ Tersalin!" : "⎘ Salin"}
                  </button>
                  <pre className="json-output">{jsonStr}</pre>
                </div>
              </details>
            );
          })()}
        </div>
      )}
    </div>
  );
}
