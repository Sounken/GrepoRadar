import { NextResponse } from "next/server";
import { db } from "@/db";
import { towns, players, alliances, playerHistory } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Calcul distance Grepolis (coordonnées de 0 à 1000, wrapping circulaire)
function grDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = Math.abs(x1 - x2);
  const dy = Math.abs(y1 - y2);
  const wx = Math.min(dx, 1000 - dx);
  const wy = Math.min(dy, 1000 - dy);
  return Math.sqrt(wx * wx + wy * wy);
}

// Nombre de jours consécutifs sans changement de points (0 si actif)
function calcInactiveDays(history: { points: number; recordedAt: Date }[]): number {
  if (history.length < 2) return 0;
  const byDay = new Map<string, number>();
  for (const h of history) {
    const day = new Date(h.recordedAt).toISOString().split("T")[0];
    byDay.set(day, h.points);
  }
  const days = [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  if (days.length < 2) return 0;
  const latestPts = days[0][1];
  let count = 0;
  for (let i = 1; i < days.length; i++) {
    if (days[i][1] === latestPts) count++;
    else break;
  }
  return count;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const originTownId = parseInt(searchParams.get("townId") || "");
  const maxDistance = parseFloat(searchParams.get("maxDistance") || "20");

  if (isNaN(originTownId)) {
    return NextResponse.json({ error: "townId required" }, { status: 400 });
  }

  const originTown = await db
    .select()
    .from(towns)
    .where(eq(towns.id, originTownId))
    .limit(1);

  if (!originTown[0]) {
    return NextResponse.json({ error: "Town not found" }, { status: 404 });
  }

  const { x: ox, y: oy } = originTown[0];

  // Récupère toutes les villes avec leur propriétaire
  const allTowns = await db
    .select({
      id: towns.id,
      name: towns.name,
      x: towns.x,
      y: towns.y,
      points: towns.points,
      playerId: towns.playerId,
      playerName: players.name,
      playerPoints: players.points,
      playerRank: players.rank,
      playerTowns: players.towns,
      allianceId: players.allianceId,
      allianceName: alliances.name,
    })
    .from(towns)
    .leftJoin(players, sql`${towns.playerId} = ${players.id}`)
    .leftJoin(alliances, sql`${players.allianceId} = ${alliances.id}`)
    .where(sql`${towns.id} != ${originTownId}`);

  // Filtre par distance
  const nearby = allTowns
    .map((t) => ({ ...t, distance: grDistance(ox, oy, t.x, t.y) }))
    .filter((t) => t.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 200);

  if (nearby.length === 0) {
    return NextResponse.json({ origin: originTown[0], targets: [] });
  }

  // Récupère les derniers snapshots pour le score d'inactivité
  const playerIds = [...new Set(nearby.map((t) => t.playerId).filter(Boolean))] as number[];

  const recentHistory = await db
    .select()
    .from(playerHistory)
    .where(
      sql`${playerHistory.playerId} = ANY(ARRAY[${sql.join(playerIds.map((id) => sql`${id}`), sql`, `)}]::int[])
      AND ${playerHistory.recordedAt} >= now() - interval '7 days'`
    )
    .orderBy(playerHistory.recordedAt);

  // Index rapide
  const historyByPlayer = new Map<number, typeof recentHistory>();
  for (const h of recentHistory) {
    if (!historyByPlayer.has(h.playerId)) historyByPlayer.set(h.playerId, []);
    historyByPlayer.get(h.playerId)!.push(h);
  }

  // Max points d'une ville sur le serveur (normalisation)
  const maxTownPoints = Math.max(...allTowns.map((t) => t.points), 1);

  const targets = nearby.map((t) => {
    const hist = historyByPlayer.get(t.playerId!) || [];
    const isGhost = !t.playerId;

    // Inactivité : 0-60 (+10 par jour sans activité, 60 pour fantôme)
    const inactiveDays = isGhost ? null : calcInactiveDays(hist);
    const inactivity = isGhost ? 60 : Math.min((inactiveDays ?? 0) * 10, 60);

    // Distance : 0-20 (plus proche = plus haut)
    const distScore = (1 - Math.min(t.distance, maxDistance) / maxDistance) * 20;
    // Points : 0-20 (points ville / max du serveur)
    const pointsScore = (t.points / maxTownPoints) * 20;

    const targetScore = Math.min(Math.round(inactivity + distScore + pointsScore), 100);

    return { ...t, inactivity, inactiveDays, targetScore };
  });

  return NextResponse.json({ origin: originTown[0], targets });
}
