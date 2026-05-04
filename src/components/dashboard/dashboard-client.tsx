"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatPill } from "@/components/ui/stat-pill";
import { PlayerSearchBar } from "@/components/ui/search-bar";
import { Sparkline } from "@/components/sparkline";
import { ServerMap, type MapTown } from "@/components/server-map";

type TopPlayer = {
  id: number;
  name: string;
  points: number;
  rank: number;
  towns: number;
  allianceName: string | null;
};

type TopAlliance = {
  id: number;
  name: string;
  points: number;
  rank: number;
  members: number;
  towns: number;
};

type RecentConquer = {
  townId: number;
  townName: string | null;
  newPlayerId: number | null;
  oldPlayerId: number | null;
  capturedAt: Date;
  newPlayerName: string | null;
  oldPlayerName: string | null;
  townPoints: number | null;
};

type TopConqueror = {
  playerId: number | null;
  playerName: string | null;
  conquestCount: number;
};

interface DashboardClientProps {
  topPlayers: TopPlayer[];
  topAlliances: TopAlliance[];
  recentConquers: RecentConquer[];
  topConquerors: TopConqueror[];
}

function timeAgo(date: Date): string {
  const h = Math.floor((Date.now() - new Date(date).getTime()) / 3600000);
  if (h < 1) return "< 1h";
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

export function DashboardClient({
  topPlayers,
  topAlliances,
  recentConquers,
  topConquerors,
}: DashboardClientProps) {
  const { t } = useTheme();
  const router = useRouter();
  const [hlTown, setHlTown] = useState<MapTown | null>(null);

  const rankColors = [t.peachDeep, t.lavenderDeep, t.sageDeep, t.roseDeep, t.powderDeep];

  return (
    <div
      style={{
        height: "100%",
        overflow: "auto",
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: t.text, letterSpacing: -0.5 }}>
            Dashboard · FR180
          </h1>
          <div style={{ color: t.textLight, fontSize: 12, marginTop: 2 }}>
            Vue d'ensemble du serveur
          </div>
        </div>
        <div style={{ marginLeft: "auto", maxWidth: 340, width: "100%" }}>
          <PlayerSearchBar placeholder="Rechercher un joueur…" />
        </div>
      </div>

      {/* Empty state */}
      {topPlayers.length === 0 && (
        <Card style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ color: t.textDim, fontSize: 36, marginBottom: 12 }}>📡</div>
          <div style={{ color: t.textMid, fontWeight: 600, fontSize: 15, marginBottom: 6 }}>
            Base de données vide
          </div>
          <div style={{ color: t.textLight, fontSize: 12 }}>
            Configure DATABASE_URL dans .env.local, puis appelle{" "}
            <code
              style={{
                background: t.lavender,
                color: t.accent,
                padding: "1px 6px",
                borderRadius: 4,
              }}
            >
              npm run db:push
            </code>{" "}
            et déclenche le cron via{" "}
            <code
              style={{
                background: t.lavender,
                color: t.accent,
                padding: "1px 6px",
                borderRadius: 4,
              }}
            >
              /api/cron/sync
            </code>
          </div>
        </Card>
      )}

      {/* Main grid */}
      {topPlayers.length > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1.4fr",
              gap: 16,
              alignItems: "start",
            }}
          >
            {/* Top joueurs */}
            <Card pad="0">
              <div
                style={{
                  padding: "14px 18px 10px",
                  borderBottom: `1px solid ${t.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 14, color: t.text }}>Top Joueurs</span>
                <Badge>Points</Badge>
              </div>
              <div>
                {topPlayers.slice(0, 5).map((p, i) => (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/player/${p.id}`)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 18px",
                      borderBottom:
                        i < 4 ? `1px solid ${t.border}` : "none",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = t.lavender + "88")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = "transparent")
                    }
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        background:
                          i === 0 ? t.peach : i === 1 ? t.lavender : t.sage,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 11,
                        color:
                          i === 0 ? t.peachDeep : i === 1 ? t.lavenderDeep : t.sageDeep,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 12,
                          color: t.text,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.name}
                      </div>
                      <div style={{ color: t.textLight, fontSize: 10 }}>
                        {p.allianceName ?? "Sans alliance"}
                      </div>
                    </div>
                    <Sparkline data={[p.points * 0.85, p.points * 0.9, p.points * 0.95, p.points]} color={t.accent} width={48} height={20} />
                    <div
                      style={{
                        color: t.accent,
                        fontWeight: 700,
                        fontSize: 12,
                        fontFamily: "var(--font-dm-mono), monospace",
                        minWidth: 56,
                        textAlign: "right",
                      }}
                    >
                      {p.points.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Conquêtes 24h */}
            <Card pad="0">
              <div
                style={{
                  padding: "14px 18px 10px",
                  borderBottom: `1px solid ${t.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 14, color: t.text }}>
                  Conquêtes récentes
                </span>
                <Badge color={t.peachDeep} bg={t.peach}>
                  24h
                </Badge>
              </div>
              <div>
                {recentConquers.length === 0 ? (
                  <div style={{ padding: "20px 18px", color: t.textDim, fontSize: 12 }}>
                    Aucune conquête dans les 24h
                  </div>
                ) : (
                  recentConquers.slice(0, 8).map((c, i) => (
                    <div
                      key={`${c.townId}-${i}`}
                      style={{
                        padding: "10px 18px",
                        borderBottom:
                          i < recentConquers.length - 1
                            ? `1px solid ${t.border}`
                            : "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 2,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: t.green,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: 12,
                            color: t.text,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
                          }}
                        >
                          {c.townName ?? `Ville #${c.townId}`}
                        </span>
                        <span
                          suppressHydrationWarning
                          style={{ color: t.textDim, fontSize: 10, flexShrink: 0 }}
                        >
                          il y a {timeAgo(c.capturedAt)}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: t.textLight,
                          paddingLeft: 12,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span
                          style={{
                            color: t.sageDeep,
                            fontWeight: 500,
                            cursor: "pointer",
                          }}
                          onClick={() =>
                            c.newPlayerId && router.push(`/player/${c.newPlayerId}`)
                          }
                        >
                          {c.newPlayerName ?? "Inconnu"}
                        </span>
                        <span> → conquiert sur </span>
                        <span style={{ color: t.red }}>
                          {c.oldPlayerName ?? "Inconnu"}
                        </span>
                      </div>
                      {c.townPoints && (
                        <div
                          style={{ fontSize: 10, color: t.textDim, paddingLeft: 12, marginTop: 1 }}
                        >
                          {c.townPoints.toLocaleString()} pts
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Top conquérants */}
            <Card pad="0">
              <div
                style={{
                  padding: "14px 18px 10px",
                  borderBottom: `1px solid ${t.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 14, color: t.text }}>
                  Top Conquérants
                </span>
                <Badge color={t.roseDeep} bg={t.rose}>
                  7 jours
                </Badge>
              </div>
              <div>
                {topConquerors.length === 0 ? (
                  <div style={{ padding: "20px 18px", color: t.textDim, fontSize: 12 }}>
                    Aucune donnée
                  </div>
                ) : (
                  topConquerors.map((c, i) => (
                    <div
                      key={c.playerId ?? i}
                      onClick={() =>
                        c.playerId && router.push(`/player/${c.playerId}`)
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 18px",
                        borderBottom:
                          i < topConquerors.length - 1
                            ? `1px solid ${t.border}`
                            : "none",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.background = t.rose + "66")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.background = "transparent")
                      }
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 13,
                          color: t.roseDeep,
                          minWidth: 16,
                        }}
                      >
                        #{i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: t.text }}>
                          {c.playerName ?? "Inconnu"}
                        </div>
                        <div style={{ fontSize: 10, color: t.textLight }}>
                          {c.conquestCount} conquête{c.conquestCount > 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Alliance ranking */}
          <Card pad="0">
            <div
              style={{
                padding: "14px 18px 10px",
                borderBottom: `1px solid ${t.border}`,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 14, color: t.text }}>
                Classement des alliances
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              }}
            >
              {topAlliances.map((a, i) => (
                <div
                  key={a.id}
                  style={{
                    padding: "12px 18px",
                    borderRight:
                      i < topAlliances.length - 1 ? `1px solid ${t.border}` : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        background: rankColors[i % rankColors.length] + "20",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 9,
                        fontWeight: 700,
                        color: rankColors[i % rankColors.length],
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </div>
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 12,
                        color: t.text,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {a.name}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span
                      style={{
                        color: t.accent,
                        fontWeight: 700,
                        fontSize: 13,
                        fontFamily: "var(--font-dm-mono), monospace",
                      }}
                    >
                      {a.points.toLocaleString()}
                    </span>
                    <span style={{ color: t.textLight, fontSize: 10 }}>pts</span>
                  </div>
                  <div style={{ color: t.textLight, fontSize: 11, marginTop: 2 }}>
                    {a.members} membres
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
