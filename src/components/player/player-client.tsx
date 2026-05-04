"use client";
import { useState, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatPill } from "@/components/ui/stat-pill";
import { Sparkline } from "@/components/sparkline";
import { ServerMap, type MapTown } from "@/components/server-map";

type Player = {
  id: number;
  name: string;
  points: number;
  rank: number;
  towns: number;
  allianceId: number | null;
  allianceName: string | null;
  updatedAt: Date;
};

type Town = {
  id: number;
  name: string;
  x: number;
  y: number;
  points: number;
  islandNo: number;
  playerId: number | null;
  islandId: number | null;
};

type HistoryPoint = {
  points: number;
  rank: number;
  towns: number;
  recordedAt: Date;
};

type Conquer = {
  townId: number;
  townName: string | null;
  newPlayerId: number | null;
  oldPlayerId: number | null;
  capturedAt: Date;
  newPlayerName: string | null;
  oldPlayerName: string | null;
};

interface PlayerClientProps {
  player: Player;
  towns: Town[];
  history: HistoryPoint[];
  recentConquers: Conquer[];
}

const fmt = (n: number) => n.toLocaleString("fr-FR");

function timeAgo(date: Date): string {
  const h = Math.floor((Date.now() - new Date(date).getTime()) / 3600000);
  if (h < 1) return "< 1h";
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

export function PlayerClient({ player, towns, history, recentConquers }: PlayerClientProps) {
  const { t } = useTheme();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [hlTown, setHlTown] = useState<MapTown | null>(null);

  const pointHistory = history.map((h) => h.points);
  const lastSeen = player.updatedAt
    ? Math.floor((Date.now() - new Date(player.updatedAt).getTime()) / 3600000)
    : null;

  const actColor = !lastSeen ? t.textLight : lastSeen < 24 ? t.green : lastSeen > 72 ? t.red : t.amber;
  const actStatus = !lastSeen
    ? "Inconnu"
    : lastSeen < 1
    ? "Actif récemment"
    : `Données vieilles de ${lastSeen}h`;

  const mapTowns = useMemo<MapTown[]>(
    () => towns.map((t) => ({ id: t.id, name: t.name, x: t.x, y: t.y, points: t.points, playerId: t.playerId, type: "active" })),
    [towns]
  );

  const pointGain =
    pointHistory.length >= 2 ? player.points - pointHistory[0] : null;

  const dailyHistory = useMemo(() => {
    const byDay = new Map<string, HistoryPoint>();
    for (const h of history) {
      const day = new Date(h.recordedAt).toISOString().split("T")[0];
      byDay.set(day, h);
    }
    const sorted = [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));
    return sorted.map(([day, h], i) => {
      const prev = sorted[i + 1]?.[1];
      return {
        day,
        points: h.points,
        pointsDelta: prev != null ? h.points - prev.points : null,
        rank: h.rank,
        rankDelta: prev != null ? h.rank - prev.rank : null,
        towns: h.towns,
        townsDelta: prev != null ? h.towns - prev.towns : null,
      };
    });
  }, [history]);

  const inactivityRows = [
    {
      label: "Données",
      val: actStatus,
      color: actColor,
    },
    {
      label: "Progression points",
      val:
        pointHistory.length >= 2
          ? pointGain! > 0
            ? `+${pointGain!.toLocaleString("fr-FR")} pts`
            : pointGain === 0
            ? "Stables (suspect)"
            : `${pointGain!.toLocaleString("fr-FR")} pts`
          : "Insuffisant",
      color:
        !pointGain ? t.textLight : pointGain > 0 ? t.green : pointGain === 0 ? t.red : t.amber,
    },
    {
      label: "Alliance",
      val: player.allianceName ?? "Aucune — vulnérable",
      color: player.allianceName ? t.textMid : t.amber,
    },
    {
      label: "Nombre de villes",
      val: `${player.towns} ville${player.towns > 1 ? "s" : ""}`,
      color: player.towns <= 1 ? t.amber : t.textMid,
    },
  ];

  return (
    <div
      style={{
        height: "100%",
        overflow: "auto",
        padding: isMobile ? "14px 12px" : "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => router.push("/")}
          style={{ background: "none", border: "none", color: t.accent, cursor: "pointer", fontSize: 12, fontWeight: 500, padding: 0 }}
        >
          ← Dashboard
        </button>
        <span style={{ color: t.textDim }}>›</span>
        <span style={{ color: t.textMid, fontSize: 12 }}>{player.name}</span>
      </div>

      {/* Profile header */}
      <Card
        style={{
          background: `linear-gradient(135deg, ${t.lavender} 0%, ${t.bgCard} 60%)`,
          border: `1.5px solid ${t.lavenderMid}`,
        }}
      >
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: t.lavenderMid,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            ⚔
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 4,
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 700, color: t.text }}>{player.name}</h2>
              <Badge color={actColor} bg={actColor + "18"}>
                {actStatus}
              </Badge>
            </div>
            <div style={{ color: t.textLight, fontSize: 12 }}>
              {player.allianceName ?? "Sans alliance"} · Rang #{player.rank}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <StatPill label="Points" value={player.points.toLocaleString("fr-FR")} color={t.accent} bg={t.lavender} />
            <StatPill label="Villes" value={player.towns} bg={t.sage} />
            <StatPill label="Rang" value={`#${player.rank}`} bg={t.powder} />
          </div>
        </div>
      </Card>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
        {/* Sparkline évolution */}
        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, color: t.text, marginBottom: 12 }}>
            Évolution des points (30j)
          </div>
          {pointHistory.length >= 2 ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: t.textDim }}>Il y a 30 jours</span>
                <span style={{ fontSize: 10, color: t.textDim }}>Aujourd'hui</span>
              </div>
              <Sparkline data={pointHistory} color={t.accent} width={320} height={60} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: t.textLight }}>
                  {pointHistory[0]?.toLocaleString("fr-FR")} pts
                </span>
                {pointGain !== null && (
                  <span style={{ fontSize: 11, color: pointGain >= 0 ? t.accent : t.red, fontWeight: 600 }}>
                    {pointGain >= 0 ? "+" : ""}
                    {pointGain.toLocaleString("fr-FR")}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div style={{ color: t.textDim, fontSize: 12, fontStyle: "italic" }}>
              Historique insuffisant — données collectées depuis peu
            </div>
          )}
        </Card>

        {/* Inactivity analysis */}
        <Card>
          <div style={{ fontWeight: 600, fontSize: 13, color: t.text, marginBottom: 12 }}>
            Analyse d'inactivité
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {inactivityRows.map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 0",
                  borderBottom: `1px solid ${t.border}`,
                }}
              >
                <span style={{ color: t.textLight, fontSize: 12 }}>{row.label}</span>
                <span style={{ color: row.color, fontSize: 12, fontWeight: 500 }}>{row.val}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Map */}
      {towns.length > 0 && (
        <Card pad="0">
          <div style={{ padding: "14px 18px 10px", borderBottom: `1px solid ${t.border}` }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: t.text }}>
              Villes de {player.name}
            </span>
            <span style={{ color: t.textDim, fontSize: 11, marginLeft: 8 }}>
              {towns.length} ville{towns.length > 1 ? "s" : ""}
            </span>
          </div>
          <div style={{ padding: "12px 16px" }}>
            <ServerMap
              towns={mapTowns}
              highlightId={hlTown?.id}
              onTownClick={(town) => setHlTown((prev) => (prev?.id === town.id ? null : town))}
              height={isMobile ? 200 : 340}
            />
          </div>
        </Card>
      )}

      {/* Town list */}
      <Card pad="0">
        <div style={{ padding: "14px 18px 10px", borderBottom: `1px solid ${t.border}` }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: t.text }}>Liste des villes</span>
        </div>
        <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: t.bg }}>
              {["Ville", "Coordonnées", "Points", "Île"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "8px 14px",
                    textAlign: "left",
                    color: t.textLight,
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    borderBottom: `1px solid ${t.border}`,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {towns.map((town, i) => (
              <tr
                key={town.id}
                style={{ borderBottom: i < towns.length - 1 ? `1px solid ${t.border}` : "none" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background = t.lavender + "55")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background = "transparent")
                }
              >
                <td style={{ padding: "9px 14px", fontWeight: 500, color: t.text, fontSize: 12 }}>
                  {town.name}
                </td>
                <td
                  style={{
                    padding: "9px 14px",
                    fontFamily: "var(--font-dm-mono), monospace",
                    fontSize: 11,
                    color: t.textMid,
                  }}
                >
                  {town.x}|{town.y}
                </td>
                <td
                  style={{
                    padding: "9px 14px",
                    color: t.accent,
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  {town.points.toLocaleString("fr-FR")}
                </td>
                <td style={{ padding: "9px 14px", color: t.textLight, fontSize: 11, fontFamily: "var(--font-dm-mono), monospace" }}>
                  {town.islandId ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>

      {/* History table */}
      {dailyHistory.length > 0 && (
        <Card pad="0">
          <div style={{ padding: "14px 18px 10px", borderBottom: `1px solid ${t.border}` }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: t.text }}>Historique</span>
            <span style={{ color: t.textDim, fontSize: 11, marginLeft: 8 }}>30 jours</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: t.bg }}>
                  {["Date", "Points", "Rang", "Villes"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "8px 14px",
                        textAlign: "left",
                        color: t.textLight,
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: 0.5,
                        borderBottom: `1px solid ${t.border}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dailyHistory.map((row, i) => {
                  const d = new Date(row.day);
                  const dateLabel = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
                  const delta = (v: number | null, invert = false) => {
                    if (v == null || v === 0) return null;
                    const pos = invert ? v < 0 : v > 0;
                    return (
                      <span style={{ color: pos ? t.green : t.red, fontSize: 10, marginLeft: 4 }}>
                        {v > 0 ? "+" : ""}{v.toLocaleString("fr-FR")}
                      </span>
                    );
                  };
                  return (
                    <tr
                      key={row.day}
                      style={{ borderBottom: i < dailyHistory.length - 1 ? `1px solid ${t.border}` : "none" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = t.lavender + "44")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                    >
                      <td style={{ padding: "8px 14px", color: t.textMid, whiteSpace: "nowrap" }}>{dateLabel}</td>
                      <td style={{ padding: "8px 14px", fontFamily: "var(--font-dm-mono), monospace" }}>
                        <span style={{ color: t.accent, fontWeight: 600 }}>{row.points.toLocaleString("fr-FR")}</span>
                        {delta(row.pointsDelta)}
                      </td>
                      <td style={{ padding: "8px 14px", fontFamily: "var(--font-dm-mono), monospace" }}>
                        <span style={{ color: t.textMid }}>#{row.rank}</span>
                        {delta(row.rankDelta, true)}
                      </td>
                      <td style={{ padding: "8px 14px", fontFamily: "var(--font-dm-mono), monospace" }}>
                        <span style={{ color: t.textMid }}>{row.towns}</span>
                        {delta(row.townsDelta)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Recent conquests */}
      {recentConquers.length > 0 && (
        <Card pad="0">
          <div style={{ padding: "14px 18px 10px", borderBottom: `1px solid ${t.border}` }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: t.text }}>
              Conquêtes récentes
            </span>
          </div>
          <div>
            {recentConquers.map((c, i) => {
              const isGain = c.newPlayerId === player.id;
              return (
                <div
                  key={`${c.townId}-${i}`}
                  style={{
                    padding: "10px 18px",
                    borderBottom: i < recentConquers.length - 1 ? `1px solid ${t.border}` : "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: isGain ? t.green : t.red,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 12, color: t.text }}>
                      {c.townName ?? `Ville #${c.townId}`}
                    </div>
                    <div style={{ fontSize: 11, color: t.textLight }}>
                      {isGain ? (
                        <>
                          Pris à <span style={{ color: t.red }}>{c.oldPlayerName ?? "?"}</span>
                        </>
                      ) : (
                        <>
                          Perdu au profit de{" "}
                          <span style={{ color: t.green }}>{c.newPlayerName ?? "?"}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ color: t.textDim, fontSize: 11 }}>
                    il y a {timeAgo(c.capturedAt)}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
