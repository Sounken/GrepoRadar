import { NextResponse } from "next/server";
import { db } from "@/db";
import { towns, players, alliances, conquers, playerHistory } from "@/db/schema";
import { eq, sql, desc, and, isNotNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Calcul distance Grepolis (coordonnées de 0 à 1000, wrapping circulaire)
function grDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = Math.abs(x1 - x2);
  const dy = Math.abs(y1 - y2);
  const wx = Math.min(dx, 1000 - dx);
  const wy = Math.min(dy, 1000 - dy);
  return Math.sqrt(wx * wx + wy * wy);
}

// Score d'inactivité : 0 (actif) → 100 (fantôme)
function inactivityScore(
  lastPoints: number,
  prevPoints: number,
  lastTowns: number,
  prevTowns: number,
  daysSinceConquer: number | null
): number {
  let score = 0;
  if (lastPoints === prevPoints) score += 40;
  else if (lastPoints < prevPoints) score += 20;
  if (lastTowns <= prevTowns) score += 20;
  if (daysSinceConquer === null) score += 20;
  else if (daysSinceConquer > 14) score += 20;
  else if (daysSinceConquer > 7) score += 10;
  return Math.min(score, 100);
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
    .where(and(isNotNull(towns.playerId), sql`${towns.id} != ${originTownId}`));

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

  const lastConquers = await db
    .select({
      playerId: conquers.newPlayerId,
      lastCapture: sql<Date>`max(${conquers.capturedAt})`,
    })
    .from(conquers)
    .where(
      sql`${conquers.newPlayerId} = ANY(ARRAY[${sql.join(playerIds.map((id) => sql`${id}`), sql`, `)}]::int[])`
    )
    .groupBy(conquers.newPlayerId);

  // Index rapide
  const historyByPlayer = new Map<number, typeof recentHistory>();
  for (const h of recentHistory) {
    if (!historyByPlayer.has(h.playerId)) historyByPlayer.set(h.playerId, []);
    historyByPlayer.get(h.playerId)!.push(h);
  }
  const lastConquerByPlayer = new Map(
    lastConquers.map((c) => [c.playerId!, c.lastCapture])
  );

  const now = Date.now();
  const targets = nearby.map((t) => {
    const hist = historyByPlayer.get(t.playerId!) || [];
    const oldest = hist[0];
    const newest = hist[hist.length - 1];
    const lastCapture = lastConquerByPlayer.get(t.playerId!);
    const daysSinceConquer = lastCapture
      ? (now - new Date(lastCapture).getTime()) / 86400000
      : null;

    // Require at least 2 distinct snapshots — with 1 snapshot oldest===newest
    // and the scoring formula (points unchanged = +40) would wrongly mark everyone inactive
    const hasRealHistory = hist.length >= 2 && oldest.recordedAt !== newest.recordedAt;
    const inactivity = hasRealHistory
      ? inactivityScore(
          newest.points,
          oldest.points,
          newest.towns,
          oldest.towns,
          daysSinceConquer
        )
      : 0;

    const targetScore = Math.round(
      inactivity * 0.6 + (1 - Math.min(t.distance, maxDistance) / maxDistance) * 40
    );

    return { ...t, inactivity, targetScore };
  });

  return NextResponse.json({ origin: originTown[0], targets });
}
