import { useState } from "react";
import { Translator } from "./Translator";
import { TranslateBatch } from "./TranslateBatch";
import { TranslateMap } from "./TranslateMap";
import "./index.css";

import logo from "./logo.png";

type Tab = "single" | "batch" | "map";

const TABS: { id: Tab; label: string; emoji: string; desc: string }[] = [
  {
    id: "single",
    label: "Single",
    emoji: "💬",
    desc: "Terjemahkan satu teks",
  },
  {
    id: "batch",
    label: "Batch",
    emoji: "📋",
    desc: "Terjemahkan banyak teks sekaligus",
  },
  {
    id: "map",
    label: "Map",
    emoji: "🗂️",
    desc: "Terjemahkan object key-value",
  },
];

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>("single");

  return (
    <div className="app">
      <div className="logo-container">
        <img src={logo} alt="Bun Logo" className="logo bun-logo" />
      </div>

      <h1>Google Translate API</h1>

      {/* Tab Navigation */}
      <div className="tab-nav" role="tablist" aria-label="Mode terjemahan">
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            className={`tab-btn${activeTab === tab.id ? " tab-btn--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-emoji">{tab.emoji}</span>
            <span className="tab-label">{tab.label}</span>
            <span className="tab-desc">{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div
        id="panel-single"
        role="tabpanel"
        aria-labelledby="tab-single"
        hidden={activeTab !== "single"}
      >
        <Translator />
      </div>

      <div
        id="panel-batch"
        role="tabpanel"
        aria-labelledby="tab-batch"
        hidden={activeTab !== "batch"}
      >
        <TranslateBatch />
      </div>

      <div
        id="panel-map"
        role="tabpanel"
        aria-labelledby="tab-map"
        hidden={activeTab !== "map"}
      >
        <TranslateMap />
      </div>
    </div>
  );
}

export default App;
