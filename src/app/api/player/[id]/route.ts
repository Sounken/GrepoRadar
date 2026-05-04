import { NextResponse } from "next/server";
import { db } from "@/db";
import { players, alliances, towns, conquers, playerHistory } from "@/db/schema";
import { eq, desc, sql, gte } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const playerId = parseInt(id);
  if (isNaN(playerId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

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
      .where(eq(players.id, playerId))
      .limit(1),

    db
      .select()
      .from(towns)
      .where(eq(towns.playerId, playerId))
      .orderBy(desc(towns.points)),

    db
      .select()
      .from(playerHistory)
      .where(
        sql`${playerHistory.playerId} = ${playerId} AND ${playerHistory.recordedAt} >= ${since30d}`
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
      .where(
        sql`${conquers.newPlayerId} = ${playerId} OR ${conquers.oldPlayerId} = ${playerId}`
      )
      .orderBy(desc(conquers.capturedAt))
      .limit(30),
  ]);

  if (!playerRow[0]) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  return NextResponse.json({
    player: playerRow[0],
    towns: playerTowns,
    history,
    recentConquers,
  });
}
