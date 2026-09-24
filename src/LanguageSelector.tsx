import { useState, useRef, useEffect, useId } from "react";
import { LANGUAGES, SOURCE_ONLY_CODES, type Language } from "./languages";

// ── Searchable dropdown ──────────────────────────────────────────────────────

interface SearchableSelectProps {
  id: string;
  label: string;
  value: string;
  options: Language[];
  onChange: (code: string) => void;
}

function SearchableSelect({ id, label, value, options, onChange }: SearchableSelectProps) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const containerRef          = useRef<HTMLDivElement>(null);
  const inputRef              = useRef<HTMLInputElement>(null);
  const listRef               = useRef<HTMLUListElement>(null);

  const selected = options.find(l => l.code === value);

  const filtered = query.trim()
    ? options.filter(l =>
        l.name.toLowerCase().includes(query.toLowerCase()) ||
        l.code.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  // Tutup saat klik di luar
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Fokus input saat dropdown terbuka
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Scroll item terpilih ke tengah saat buka
  useEffect(() => {
    if (open && listRef.current && !query) {
      const active = listRef.current.querySelector("[data-active='true']") as HTMLElement;
      active?.scrollIntoView({ block: "nearest" });
    }
  }, [open, query]);

  function handleSelect(code: string) {
    onChange(code);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setOpen(false); setQuery(""); }
    if (e.key === "Enter" && filtered.length === 1) handleSelect(filtered[0].code);
  }

  const dropdownId = `${id}-dropdown`;

  return (
    <div className="lang-select-wrap" ref={containerRef}>
      <label className="lang-select-label" htmlFor={id}>{label}</label>

      {/* Trigger */}
      <button
        id={id}
        type="button"
        className="lang-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={dropdownId}
        onClick={() => setOpen(v => !v)}
      >
        <span className="lang-trigger-name">{selected?.name ?? value}</span>
        <span className="lang-trigger-code">{value !== "auto" ? value : ""}</span>
        <span className={`lang-trigger-arrow${open ? " open" : ""}`}>▾</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="lang-dropdown" role="dialog" aria-label={`Pilih bahasa ${label}`}>
          {/* Search input */}
          <div className="lang-search-wrap">
            <span className="lang-search-icon">🔍</span>
            <input
              ref={inputRef}
              className="lang-search-input"
              type="text"
              placeholder="Cari bahasa..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Cari bahasa"
            />
            {query && (
              <button className="lang-search-clear" onClick={() => setQuery("")} aria-label="Hapus pencarian">✕</button>
            )}
          </div>

          {/* List */}
          <ul
            ref={listRef}
            id={dropdownId}
            className="lang-option-list"
            role="listbox"
            aria-label={label}
          >
            {filtered.length === 0 && (
              <li className="lang-option-empty">Bahasa tidak ditemukan</li>
            )}
            {filtered.map(lang => (
              <li
                key={lang.code}
                role="option"
                aria-selected={lang.code === value}
                data-active={lang.code === value}
                className={`lang-option${lang.code === value ? " lang-option--active" : ""}`}
                onClick={() => handleSelect(lang.code)}
              >
                <span className="lang-option-name">{lang.name}</span>
                <span className="lang-option-code">{lang.code}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── LanguageSelector ─────────────────────────────────────────────────────────

interface LanguageSelectorProps {
  fromLang: string;
  toLang: string;
  onFromChange: (code: string) => void;
  onToChange: (code: string) => void;
}

export function LanguageSelector({ fromLang, toLang, onFromChange, onToChange }: LanguageSelectorProps) {
  const uid = useId();
  const targetLanguages = LANGUAGES.filter(l => !SOURCE_ONLY_CODES.has(l.code));

  function handleSwap() {
    if (fromLang === "auto") return;
    onFromChange(toLang);
    onToChange(fromLang);
  }

  const canSwap = fromLang !== "auto";

  return (
    <div className="lang-selector">
      <SearchableSelect
        id={`${uid}-from`}
        label="Dari"
        value={fromLang}
        options={LANGUAGES}
        onChange={onFromChange}
      />

      <button
        className={`lang-swap-btn${canSwap ? "" : " lang-swap-btn--disabled"}`}
        onClick={handleSwap}
        disabled={!canSwap}
        title={canSwap ? "Tukar bahasa" : "Tidak bisa tukar saat deteksi otomatis"}
        aria-label="Tukar bahasa sumber dan tujuan"
      >
        ⇄
      </button>

      <SearchableSelect
        id={`${uid}-to`}
        label="Ke"
        value={toLang}
        options={targetLanguages}
        onChange={onToChange}
      />
    </div>
  );
}
