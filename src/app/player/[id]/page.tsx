import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PlayerClient } from "@/components/player/player-client";
import { db } from "@/db";
import { players, alliances, towns, conquers, playerHistory } from "@/db/schema";
import { eq, desc, sql, gte } from "drizzle-orm";

export const revalidate = 1800;

async function getPlayerData(id: number) {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [playerRow, playerTowns, history, recentConquers] = await Promise.all([
    db
      .select({
        id: players.id,
        name: players.name,
        points: players.points,
        rank: players.rank,
        towns: players.towns,
        allianceId: players.allianceId,
        allianceName: alliances.name,
        updatedAt: players.updatedAt,
      })
      .from(players)
      .leftJoin(alliances, sql`${players.allianceId} = ${alliances.id}`)
      .where(eq(players.id, id))
      .limit(1),

    db
      .select()
      .from(towns)
      .where(eq(towns.playerId, id))
      .orderBy(desc(towns.points)),

    db
      .select()
      .from(playerHistory)
      .where(
        sql`${playerHistory.playerId} = ${id} AND ${playerHistory.recordedAt} >= ${since30d}`
      )
      .orderBy(playerHistory.recordedAt),

    db
      .select({
        townId: conquers.townId,
        townName: towns.name,
        newPlayerId: conquers.newPlayerId,
        oldPlayerId: conquers.oldPlayerId,
        capturedAt: conquers.capturedAt,
        newPlayerName: sql<string>`np.name`,
        oldPlayerName: sql<string>`op.name`,
      })
      .from(conquers)
      .leftJoin(towns, sql`${conquers.townId} = ${towns.id}`)
      .leftJoin(sql`players np`, sql`${conquers.newPlayerId} = np.id`)
      .leftJoin(sql`players op`, sql`${conquers.oldPlayerId} = op.id`)
      .where(sql`${conquers.newPlayerId} = ${id} OR ${conquers.oldPlayerId} = ${id}`)
      .orderBy(desc(conquers.capturedAt))
      .limit(20),
  ]);

  return { player: playerRow[0] ?? null, towns: playerTowns, history, recentConquers };
}

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const playerId = parseInt(id);
  if (isNaN(playerId)) notFound();

  try {
    const data = await getPlayerData(playerId);
    if (!data.player) notFound();
    return (
      <AppShell>
        <PlayerClient {...data} />
      </AppShell>
    );
  } catch {
    notFound();
  }
}
