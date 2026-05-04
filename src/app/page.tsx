import { AppShell } from "@/components/layout/app-shell";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { db } from "@/db";
import { players, alliances, conquers, towns } from "@/db/schema";
import { desc, sql } from "drizzle-orm";

export const revalidate = 1800;

async function getDashboardData() {
  try {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [topPlayers, topAlliances, recentConquers, topConquerors, allianceConquests, allianceLosses] = await Promise.all([
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

      db.select().from(alliances).orderBy(desc(alliances.points)).limit(10),

      db
        .select({
          townId: conquers.townId,
          townName: towns.name,
          newPlayerId: conquers.newPlayerId,
          oldPlayerId: conquers.oldPlayerId,
          capturedAt: conquers.capturedAt,
          newPlayerName: sql<string>`np.name`,
          oldPlayerName: sql<string>`op.name`,
          townPoints: towns.points,
        })
        .from(conquers)
        .leftJoin(towns, sql`${conquers.townId} = ${towns.id}`)
        .leftJoin(sql`players np`, sql`${conquers.newPlayerId} = np.id`)
        .leftJoin(sql`players op`, sql`${conquers.oldPlayerId} = op.id`)
        .where(sql`${conquers.capturedAt} >= ${since7d}`)
        .orderBy(desc(conquers.capturedAt))
        .limit(20),

      db
        .select({
          playerId: conquers.newPlayerId,
          playerName: sql<string>`np.name`,
          conquestCount: sql<number>`count(*)::int`,
        })
        .from(conquers)
        .leftJoin(sql`players np`, sql`${conquers.newPlayerId} = np.id`)
        .where(sql`${conquers.capturedAt} >= ${since30d} AND ${conquers.newPlayerId} IS NOT NULL`)
        .groupBy(conquers.newPlayerId, sql`np.name`)
        .orderBy(sql`count(*) desc`)
        .limit(10),

      db
        .select({
          allianceId: conquers.newAllianceId,
          allianceName: sql<string>`a.name`,
          count: sql<number>`count(*)::int`,
        })
        .from(conquers)
        .leftJoin(sql`alliances a`, sql`${conquers.newAllianceId} = a.id`)
        .where(sql`${conquers.newAllianceId} IS NOT NULL AND ${conquers.capturedAt} >= ${since7d}`)
        .groupBy(conquers.newAllianceId, sql`a.name`)
        .orderBy(sql`count(*) desc`)
        .limit(10),

      db
        .select({
          allianceId: conquers.oldAllianceId,
          allianceName: sql<string>`a.name`,
          count: sql<number>`count(*)::int`,
        })
        .from(conquers)
        .leftJoin(sql`alliances a`, sql`${conquers.oldAllianceId} = a.id`)
        .where(sql`${conquers.oldAllianceId} IS NOT NULL AND ${conquers.capturedAt} >= ${since7d}`)
        .groupBy(conquers.oldAllianceId, sql`a.name`)
        .orderBy(sql`count(*) desc`)
        .limit(10),
    ]);

    return { topPlayers, topAlliances, recentConquers, topConquerors, allianceConquests, allianceLosses };
  } catch {
    return { topPlayers: [], topAlliances: [], recentConquers: [], topConquerors: [], allianceConquests: [], allianceLosses: [] };
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  return (
    <AppShell>
      <DashboardClient {...data} />
    </AppShell>
  );
}
