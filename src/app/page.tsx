import { AppShell } from "@/components/layout/app-shell";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { db } from "@/db";
import { players, alliances, conquers, towns } from "@/db/schema";
import { desc, gte, sql } from "drizzle-orm";

export const revalidate = 1800;

async function getDashboardData() {
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [topPlayers, topAlliances, recentConquers, topConquerors] = await Promise.all([
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

      db.select().from(alliances).orderBy(desc(alliances.points)).limit(8),

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
        .where(gte(conquers.capturedAt, since24h))
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
        .where(gte(conquers.capturedAt, since7d))
        .groupBy(conquers.newPlayerId, sql`np.name`)
        .orderBy(sql`count(*) desc`)
        .limit(7),
    ]);

    return { topPlayers, topAlliances, recentConquers, topConquerors };
  } catch {
    return { topPlayers: [], topAlliances: [], recentConquers: [], topConquerors: [] };
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
