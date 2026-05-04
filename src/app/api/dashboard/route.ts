import { NextResponse } from "next/server";
import { db } from "@/db";
import { players, alliances, conquers, towns } from "@/db/schema";
import { desc, gte, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [topPlayers, topAlliances, recentConquers] = await Promise.all([
    db
      .select({
        id: players.id,
        name: players.name,
        points: players.points,
        rank: players.rank,
        towns: players.towns,
        allianceName: alliances.name,
      })
      .from(players)
      .leftJoin(alliances, sql`${players.allianceId} = ${alliances.id}`)
      .orderBy(desc(players.points))
      .limit(10),

    db
      .select()
      .from(alliances)
      .orderBy(desc(alliances.points))
      .limit(10),

    db
      .select({
        townId: conquers.townId,
        townName: towns.name,
        newPlayerId: conquers.newPlayerId,
        oldPlayerId: conquers.oldPlayerId,
        newAllianceId: conquers.newAllianceId,
        oldAllianceId: conquers.oldAllianceId,
        capturedAt: conquers.capturedAt,
        newPlayerName: sql<string>`np.name`,
        oldPlayerName: sql<string>`op.name`,
      })
      .from(conquers)
      .leftJoin(towns, sql`${conquers.townId} = ${towns.id}`)
      .leftJoin(sql`players np`, sql`${conquers.newPlayerId} = np.id`)
      .leftJoin(sql`players op`, sql`${conquers.oldPlayerId} = op.id`)
      .where(gte(conquers.capturedAt, since24h))
      .orderBy(desc(conquers.capturedAt))
      .limit(50),
  ]);

  return NextResponse.json({ topPlayers, topAlliances, recentConquers });
}
