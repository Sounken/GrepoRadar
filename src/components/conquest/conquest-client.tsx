"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { TypeBadge } from "@/components/ui/badge";
import { MiniBar, ScoreChip } from "@/components/ui/score-chip";
import { TownSearchBar } from "@/components/ui/search-bar";
import { ServerMap, type MapTown } from "@/components/server-map";

type ApiTown = {
  id: number;
  name: string;
  x: number;
  y: number;
  points: number;
  playerId: number | null;
  playerName: string | null;
  playerPoints: number | null;
  playerRank: number | null;
  playerTowns: number | null;
  allianceId: number | null;
  allianceName: string | null;
  distance: number;
  inactivity: number;
  inactiveDays: number | null;
  targetScore: number;
};

type Filters = {
  maxDist: number | null;
  minPoints: number | null;
  maxPoints: number | null;
  onlyInactive: boolean;
  hideGhost: boolean;
  onlyGhost: boolean;
};

type SortKey = "targetScore" | "inactivity" | "distance" | "points";

// Calibré empiriquement sur FR180 : temps (min) ≈ 1.3 × distance²
function colonyTime(distance: number): string {
  const totalMin = Math.round(1.3 * distance * distance);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

function townType(town: ApiTown): string {
  if (!town.playerId) return "ghost";
  if (town.inactivity >= 70) return "inactive";
  if (town.inactivity >= 40) return "suspect";
  return "active";
}

export function ConquestClient() {
  const { t } = useTheme();
  const router = useRouter();
  const [originSearchQ, setOriginSearchQ] = useState("");
  const [fromTownId, setFromTownId] = useState<number | null>(null);
  const [fromTownLabel, setFromTownLabel] = useState<{ name: string; x: number; y: number } | null>(null);
  const [targets, setTargets] = useState<ApiTown[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<ApiTown | null>(null);
  const [filters, setFilters] = useState<Filters>({
    maxDist: null,
    minPoints: null,
    maxPoints: null,
    onlyInactive: false,
    hideGhost: false,
    onlyGhost: false,
  });
  const [sortKey, setSortKey] = useState<SortKey>("targetScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const fc = (k: keyof Filters, v: Filters[keyof Filters]) => {
    if (k === "onlyGhost" && v === true)
      setFilters((f) => ({ ...f, onlyGhost: true, hideGhost: false }));
    else if (k === "hideGhost" && v === true)
      setFilters((f) => ({ ...f, hideGhost: true, onlyGhost: false }));
    else
      setFilters((f) => ({ ...f, [k]: v }));
  };

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const handleSelectTown = async (town: { id: number; name: string; x: number; y: number }) => {
    setFromTownId(town.id);
    setFromTownLabel({ name: town.name, x: town.x, y: town.y });
    setTargets([]);
    setSelectedTarget(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/conquest?townId=${town.id}&maxDistance=${filters.maxDist ?? 30}`
      );
      if (!res.ok) {
        console.error("Conquest API error:", res.status);
        setTargets([]);
        return;
      }
      const data = await res.json();
      setTargets(data.targets ?? []);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = targets.filter((t) => {
      if (filters.maxDist && t.distance > filters.maxDist) return false;
      if (filters.minPoints && t.points < filters.minPoints) return false;
      if (filters.maxPoints && t.points > filters.maxPoints) return false;
      if (filters.hideGhost && !t.playerId) return false;
      if (filters.onlyGhost && t.playerId !== null) return false;
      if (filters.onlyInactive && t.inactivity < 40) return false;
      return true;
    });
    const val = (x: ApiTown) =>
      sortKey === "targetScore"
        ? x.targetScore
        : sortKey === "inactivity"
        ? x.inactivity
        : sortKey === "distance"
        ? x.distance
        : x.points;
    list.sort((a, b) => (sortDir === "desc" ? val(b) - val(a) : val(a) - val(b)));
    return list;
  }, [targets, filters, sortKey, sortDir]);

  const mapTowns = useMemo<MapTown[]>(() => {
    const targets = filtered.map((t) => ({
      id: t.id,
      name: t.name,
      x: t.x,
      y: t.y,
      points: t.points,
      playerId: t.playerId,
      type: townType(t),
    }));
    // Ajoute la ville d'origine pour que ServerMap puisse trouver son île
    if (fromTownId && fromTownLabel) {
      targets.push({
        id: fromTownId,
        name: fromTownLabel.name,
        x: fromTownLabel.x,
        y: fromTownLabel.y,
        points: 0,
        playerId: null,
        type: "mine",
      });
    }
    return targets;
  }, [filtered, fromTownId, fromTownLabel]);

  const TH = ({ label, sortK }: { label: string; sortK?: SortKey }) => (
    <th
      onClick={() => sortK && toggleSort(sortK)}
      style={{
        padding: "8px 12px",
        textAlign: "left",
        color: sortKey === sortK ? t.accent : t.textLight,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 0.5,
        borderBottom: `1px solid ${t.border}`,
        cursor: sortK ? "pointer" : "default",
        userSelect: "none",
        background: t.bg,
        position: "sticky",
        top: 0,
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {sortK && sortKey === sortK && (sortDir === "desc" ? " ▼" : " ▲")}
    </th>
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Tooltip custom */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x + 14,
            top: tooltip.y - 32,
            background: t.text,
            color: t.bg,
            padding: "4px 10px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 500,
            whiteSpace: "nowrap",
            zIndex: 9999,
            pointerEvents: "none",
            boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
          }}
        >
          {tooltip.text}
        </div>
      )}
      {/* Header */}
      <div
        style={{
          padding: "14px 24px 12px",
          borderBottom: `1px solid ${t.border}`,
          background: t.bgCard,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: t.text, letterSpacing: -0.3 }}>
              ⚔ Mode Conquête
            </h1>
            <div style={{ color: t.textLight, fontSize: 11, marginTop: 1 }}>
              Choisissez un point de départ et explorez les cibles
            </div>
          </div>
          {fromTownLabel && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginLeft: "auto",
                background: t.lavender,
                borderRadius: 10,
                padding: "6px 14px",
                border: `1px solid ${t.lavenderMid}`,
              }}
            >
              <div>
                <div style={{ color: t.textDim, fontSize: 9, letterSpacing: 1 }}>DEPUIS</div>
                <div style={{ color: t.accent, fontWeight: 600, fontSize: 13 }}>
                  {fromTownLabel.name}
                </div>
                <div style={{ color: t.textLight, fontSize: 10 }}>
                  {fromTownLabel.x}|{fromTownLabel.y}
                </div>
              </div>
              <button
                onClick={() => {
                  setFromTownId(null);
                  setFromTownLabel(null);
                  setTargets([]);
                  setSelectedTarget(null);
                }}
                style={{
                  background: t.lavenderMid,
                  border: "none",
                  borderRadius: 6,
                  padding: "3px 8px",
                  fontSize: 10,
                  color: t.lavenderDeep,
                  cursor: "pointer",
                }}
              >
                Changer
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {/* Left panel */}
        <div
          style={{
            width: 240,
            borderRight: `1px solid ${t.border}`,
            background: t.bgCard,
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            overflow: "auto",
          }}
        >
          {/* Town search */}
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${t.border}` }}>
            <div style={{ color: t.textDim, fontSize: 9, letterSpacing: 1, marginBottom: 8 }}>
              POINT DE DÉPART
            </div>
            <TownSearchBar
              value={originSearchQ}
              onChange={setOriginSearchQ}
              onSelect={(town) => handleSelectTown(town)}
              placeholder="Nom d'une ville…"
            />
          </div>

          <div style={{ flex: 1 }} />

          {/* Filters */}
          {fromTownId && (
            <div
              style={{
                padding: "12px 14px",
                borderTop: `1px solid ${t.border}`,
                display: "flex",
                flexDirection: "column",
                gap: 7,
              }}
            >
              <div style={{ color: t.textDim, fontSize: 9, letterSpacing: 1, marginBottom: 2 }}>
                FILTRES
              </div>
              {(
                [
                  { label: "Dist. max", key: "maxDist" as const },
                  { label: "Pts min", key: "minPoints" as const },
                  { label: "Pts max", key: "maxPoints" as const },
                ] as { label: string; key: keyof Filters }[]
              ).map((f) => (
                <label
                  key={f.key}
                  style={{ display: "flex", flexDirection: "column", gap: 3 }}
                >
                  <span style={{ color: t.textLight, fontSize: 10 }}>{f.label}</span>
                  <input
                    type="number"
                    value={(filters[f.key] as number | null) ?? ""}
                    placeholder="—"
                    onChange={(e) =>
                      fc(f.key, e.target.value ? parseInt(e.target.value) : null)
                    }
                    style={{
                      background: t.bg,
                      border: `1px solid ${t.border}`,
                      borderRadius: 6,
                      padding: "4px 8px",
                      fontSize: 11,
                      outline: "none",
                      color: t.text,
                      width: "100%",
                      fontFamily: "var(--font-dm-mono), monospace",
                    }}
                  />
                </label>
              ))}
              {(
                [
                  { label: "Inactifs seulement", key: "onlyInactive" as const },
                  { label: "Masquer fantômes", key: "hideGhost" as const },
                  { label: "Fantôme uniquement", key: "onlyGhost" as const },
                ] as { label: string; key: keyof Filters }[]
              ).map((f) => (
                <label
                  key={f.key}
                  style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                >
                  <input
                    type="checkbox"
                    checked={!!(filters[f.key] as boolean)}
                    onChange={(e) => fc(f.key, e.target.checked)}
                    style={{ accentColor: t.accent }}
                  />
                  <span style={{ color: t.textMid, fontSize: 11 }}>{f.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Main content */}
        {!fromTownId ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 10,
              color: t.textDim,
            }}
          >
            <div style={{ fontSize: 36 }}>⚔</div>
            <div style={{ fontWeight: 600, fontSize: 15, color: t.textLight }}>
              Choisissez une ville de départ
            </div>
            <div style={{ fontSize: 12 }}>Sélectionnez une ville dans le panneau gauche</div>
          </div>
        ) : loading ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: t.textLight,
              fontSize: 13,
            }}
          >
            Chargement des cibles…
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Stats bar */}
            <div
              style={{
                padding: "8px 16px",
                borderBottom: `1px solid ${t.border}`,
                background: t.bgCard,
                display: "flex",
                gap: 16,
                alignItems: "center",
                flexShrink: 0,
                flexWrap: "wrap",
              }}
            >
              <span style={{ color: t.green, fontWeight: 600, fontSize: 12 }}>
                {filtered.filter((x) => x.targetScore >= 80).length} top cibles
              </span>
              <span style={{ color: t.red, fontSize: 12 }}>
                {filtered.filter((x) => x.inactivity >= 70).length} inactifs
              </span>
              <span style={{ color: t.lavenderDeep, fontSize: 12 }}>
                {filtered.filter((x) => !x.playerId).length} fantômes
              </span>
              <span style={{ color: t.textDim, fontSize: 12 }}>{filtered.length} total</span>
            </div>

            {/* Map + table split */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
              {/* Map */}
              <div
                style={{
                  flex: "0 0 42%",
                  borderRight: `1px solid ${t.border}`,
                  padding: 12,
                  overflow: "hidden",
                  background: t.bg,
                }}
              >
                <ServerMap
                  towns={mapTowns}
                  highlightId={selectedTarget?.id}
                  originTownId={fromTownId ?? undefined}
                  onTownClick={(town) => {
                    const tgt = filtered.find((x) => x.id === town.id);
                    if (tgt) setSelectedTarget((p) => (p?.id === tgt.id ? null : tgt));
                  }}
                  height={500}
                />
              </div>

              {/* Table */}
              <div style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 12,
                    minWidth: 480,
                  }}
                >
                  <thead>
                    <tr>
                      <TH label="VILLE" />
                      <TH label="JOUEUR" />
                      <TH label="PTS" sortK="points" />
                      <TH label="DIST." sortK="distance" />
                      <TH label="TYPE" />
                      <TH label="INACT." sortK="inactivity" />
                      <TH label="SCORE" sortK="targetScore" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => {
                      const isSel = selectedTarget?.id === item.id;
                      const isGhost = !item.playerId;
                      const inactiveTip = isGhost
                        ? "Ville fantôme — sans propriétaire"
                        : item.inactiveDays != null
                        ? `Inactif depuis ${item.inactiveDays} jour${item.inactiveDays > 1 ? "s" : ""} · score ${item.inactivity}/100`
                        : item.inactivity >= 20
                        ? `Score d'inactivité : ${item.inactivity}/100 (historique insuffisant)`
                        : undefined;
                      return (
                        <tr
                          key={item.id}
                          onClick={() =>
                            setSelectedTarget((p) => (p?.id === item.id ? null : item))
                          }
                          onMouseEnter={(e) =>
                            ((e.currentTarget as HTMLElement).style.background =
                              t.lavender + "88")
                          }
                          onMouseLeave={(e) =>
                            ((e.currentTarget as HTMLElement).style.background = isSel
                              ? t.lavender
                              : "transparent")
                          }
                          style={{
                            background: isSel ? t.lavender : "transparent",
                            borderBottom: `1px solid ${t.border}`,
                            cursor: "pointer",
                            opacity: isGhost ? 0.55 : 1,
                          }}
                        >
                          <td style={{ padding: "8px 12px" }}>
                            <div style={{ fontWeight: 500, color: isGhost ? t.textDim : t.text }}>{item.name}</div>
                            <div
                              style={{
                                color: t.textDim,
                                fontSize: 10,
                                fontFamily: "var(--font-dm-mono), monospace",
                              }}
                            >
                              {item.x}|{item.y}
                            </div>
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <div
                              onClick={(e) => {
                                if (!item.playerId) return;
                                e.stopPropagation();
                                router.push(`/player/${item.playerId}`);
                              }}
                              style={{
                                color: item.playerId ? t.lavenderDeep : t.textDim,
                                fontSize: 11,
                                cursor: item.playerId ? "pointer" : "default",
                                textDecoration: item.playerId ? "underline" : "none",
                                textUnderlineOffset: 2,
                              }}
                            >
                              {item.playerName ?? "—"}
                            </div>
                            <div
                              style={{
                                color: t.textDim,
                                fontSize: 10,
                                maxWidth: 90,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item.allianceName ?? "Sans alliance"}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              color: t.accent,
                              fontWeight: 600,
                              fontFamily: "var(--font-dm-mono), monospace",
                            }}
                          >
                            {item.points.toLocaleString()}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <span
                              onMouseEnter={(e) =>
                                setTooltip({
                                  text: `~${colonyTime(item.distance)} en navire de colonisation`,
                                  x: e.clientX,
                                  y: e.clientY,
                                })
                              }
                              onMouseMove={(e) =>
                                setTooltip((p) => p ? { ...p, x: e.clientX, y: e.clientY } : null)
                              }
                              onMouseLeave={() => setTooltip(null)}
                              style={{
                                color:
                                  item.distance < 25
                                    ? t.green
                                    : item.distance < 50
                                    ? t.amber
                                    : t.red,
                                fontWeight: 600,
                                fontFamily: "var(--font-dm-mono), monospace",
                                cursor: "default",
                                borderBottom: `1px dashed ${t.border}`,
                              }}
                            >
                              {item.distance.toFixed(1)}
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <TypeBadge type={townType(item)} />
                          </td>
                          <td
                            style={{ padding: "8px 12px" }}
                            onMouseEnter={inactiveTip ? (e) => setTooltip({ text: inactiveTip, x: e.clientX, y: e.clientY }) : undefined}
                            onMouseMove={inactiveTip ? (e) => setTooltip((p) => p ? { ...p, x: e.clientX, y: e.clientY } : null) : undefined}
                            onMouseLeave={inactiveTip ? () => setTooltip(null) : undefined}
                          >
                            <MiniBar val={item.inactivity} />
                            {item.inactiveDays != null && (
                              <div style={{ fontSize: 9, color: t.textDim, marginTop: 1 }}>
                                {item.inactiveDays}j
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <ScoreChip score={item.targetScore} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected target bar */}
            {selectedTarget && (
              <div
                style={{
                  padding: "10px 16px",
                  borderTop: `2px solid ${t.lavenderMid}`,
                  background: t.lavender,
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                  flexShrink: 0,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    borderLeft: `3px solid ${selectedTarget.targetScore >= 80 ? t.scoreA : selectedTarget.targetScore >= 60 ? t.scoreB : t.scoreD}`,
                    paddingLeft: 10,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14, color: t.text }}>
                    {selectedTarget.name}
                  </div>
                  <div style={{ color: t.textLight, fontSize: 11 }}>
                    {selectedTarget.x}|{selectedTarget.y}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ color: t.textDim, fontSize: 9 }}>JOUEUR</div>
                    <div style={{ color: t.textMid, fontSize: 12 }}>
                      {selectedTarget.playerName ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: t.textDim, fontSize: 9 }}>ALLIANCE</div>
                    <div style={{ color: t.textMid, fontSize: 12 }}>
                      {selectedTarget.allianceName ?? "Aucune"}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: t.textDim, fontSize: 9 }}>INACTIVITÉ</div>
                    <div style={{ color: t.red, fontSize: 12 }}>{selectedTarget.inactivity}/100</div>
                  </div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
                  <ScoreChip score={selectedTarget.targetScore} size="lg" />
                  <button
                    onClick={() =>
                      navigator.clipboard?.writeText(
                        `${selectedTarget.x}|${selectedTarget.y}`
                      )
                    }
                    style={{
                      background: t.bgCard,
                      border: `1px solid ${t.border}`,
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: 11,
                      color: t.textMid,
                      cursor: "pointer",
                    }}
                  >
                    Copier coords
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
