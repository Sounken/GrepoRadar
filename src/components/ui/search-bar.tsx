"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";

type PlayerResult = { id: number; name: string; points: number; rank: number };

/** Barre de recherche joueur avec autocomplete (dashboard) */
export function PlayerSearchBar({ placeholder }: { placeholder?: string }) {
  const { t } = useTheme();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Debounced autocomplete
  useEffect(() => {
    if (value.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        setResults((data.players ?? []).slice(0, 5));
      } catch { setResults([]); }
    }, 250);
    return () => clearTimeout(timer);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setResults([]);
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const go = (player: PlayerResult) => {
    setValue(player.name);
    setResults([]);
    router.push(`/player/${player.id}`);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") {
      if (activeIdx >= 0 && results[activeIdx]) go(results[activeIdx]);
      else if (results[0]) go(results[0]);
    }
    else if (e.key === "Escape") { setResults([]); setActiveIdx(-1); }
  };

  const open = focused && results.length > 0;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          border: `1.5px solid ${focused ? t.accent : t.borderMid}`,
          borderRadius: open ? "9px 9px 0 0" : 9,
          overflow: "hidden",
          transition: "border-color 0.15s",
          background: t.bgCard,
          boxShadow: focused ? `0 0 0 3px ${t.accent}18` : "none",
        }}
      >
        <input
          value={value}
          onChange={(e) => { setValue(e.target.value); setActiveIdx(-1); }}
          placeholder={placeholder ?? "Rechercher un joueur…"}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKey}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", padding: "9px 14px", fontSize: 13, color: t.text }}
        />
        {value && (
          <button
            onMouseDown={(e) => { e.preventDefault(); setValue(""); setResults([]); }}
            style={{ background: "transparent", border: "none", color: t.textLight, padding: "0 10px", cursor: "pointer", fontSize: 16 }}
          >
            ×
          </button>
        )}
      </div>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: t.bgCard,
            border: `1.5px solid ${t.accent}`,
            borderTop: `1px solid ${t.border}`,
            borderRadius: "0 0 9px 9px",
            overflow: "hidden",
            zIndex: 50,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          {results.map((p, i) => (
            <div
              key={p.id}
              onMouseDown={() => go(p)}
              onMouseEnter={() => setActiveIdx(i)}
              style={{
                padding: "9px 14px",
                cursor: "pointer",
                background: i === activeIdx ? t.lavender : "transparent",
                borderBottom: i < results.length - 1 ? `1px solid ${t.border}` : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 13, color: t.text, fontWeight: 500 }}>{p.name}</span>
              <span style={{ fontSize: 11, color: t.textLight, fontFamily: "var(--font-dm-mono), monospace" }}>
                #{p.rank} · {p.points.toLocaleString()} pts
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Barre de recherche ville avec autocomplete (conquête) */
type TownResult = { id: number; name: string; x: number; y: number; playerId: number | null };

export function TownSearchBar({
  value,
  onChange,
  onSelect,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (town: TownResult) => void;
  placeholder?: string;
}) {
  const { t } = useTheme();
  const [focused, setFocused] = useState(false);
  const [results, setResults] = useState<TownResult[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        setResults((data.towns ?? []).slice(0, 5));
      } catch { setResults([]); }
    }, 250);
    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setResults([]);
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (town: TownResult) => {
    onChange(town.name);
    setResults([]);
    onSelect(town);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && activeIdx >= 0 && results[activeIdx]) select(results[activeIdx]);
    else if (e.key === "Escape") { setResults([]); setActiveIdx(-1); }
  };

  const open = focused && results.length > 0;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          border: `1.5px solid ${focused ? t.accent : t.borderMid}`,
          borderRadius: open ? "8px 8px 0 0" : 8,
          overflow: "hidden",
          background: t.bg,
          boxShadow: focused ? `0 0 0 2px ${t.accent}22` : "none",
        }}
      >
        <input
          value={value}
          onChange={(e) => { onChange(e.target.value); setActiveIdx(-1); }}
          placeholder={placeholder ?? "Nom d'une ville…"}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKey}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", padding: "7px 10px", fontSize: 11, color: t.text }}
        />
        {value && (
          <button
            onMouseDown={(e) => { e.preventDefault(); onChange(""); setResults([]); }}
            style={{ background: "transparent", border: "none", color: t.textLight, padding: "0 8px", cursor: "pointer" }}
          >
            ×
          </button>
        )}
      </div>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: t.bgCard,
            border: `1.5px solid ${t.accent}`,
            borderTop: `1px solid ${t.border}`,
            borderRadius: "0 0 8px 8px",
            overflow: "hidden",
            zIndex: 50,
            boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
          }}
        >
          {results.map((town, i) => (
            <div
              key={town.id}
              onMouseDown={() => select(town)}
              onMouseEnter={() => setActiveIdx(i)}
              style={{
                padding: "7px 10px",
                cursor: "pointer",
                background: i === activeIdx ? t.lavender : "transparent",
                borderBottom: i < results.length - 1 ? `1px solid ${t.border}` : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 11, color: t.text, fontWeight: 500 }}>{town.name}</span>
              <span style={{ fontSize: 10, color: t.textLight, fontFamily: "var(--font-dm-mono), monospace" }}>
                {town.x}|{town.y}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
