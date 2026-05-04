import { NextResponse } from "next/server";
import { db } from "@/db";
import { alliances, players, towns, conquers, playerHistory, islands } from "@/db/schema";
import {
  parseAlliances,
  parsePlayers,
  parseTowns,
  parseConquers,
  parseIslands,
} from "@/lib/grepolis-parser";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [alliancesData, playersData, townsData, conquersData] =
      await Promise.all([
        parseAlliances(),
        parsePlayers(),
        parseTowns(),
        parseConquers(),
      ]);

    // Upsert alliances
    if (alliancesData.length > 0) {
      await db
        .insert(alliances)
        .values(alliancesData)
        .onConflictDoUpdate({
          target: alliances.id,
          set: {
            name: sql`excluded.name`,
            points: sql`excluded.points`,
            rank: sql`excluded.rank`,
            members: sql`excluded.members`,
            towns: sql`excluded.towns`,
            updatedAt: sql`now()`,
          },
        });
    }

    // Upsert players
    if (playersData.length > 0) {
      await db
        .insert(players)
        .values(playersData)
        .onConflictDoUpdate({
          target: players.id,
          set: {
            name: sql`excluded.name`,
            allianceId: sql`excluded.alliance_id`,
            points: sql`excluded.points`,
            rank: sql`excluded.rank`,
            towns: sql`excluded.towns`,
            updatedAt: sql`now()`,
          },
        });

      // Snapshot pour l'historique
      const now = new Date();
      const snapshots = playersData.map((p) => ({
        playerId: p.id,
        points: p.points,
        rank: p.rank,
        towns: p.towns,
        recordedAt: now,
      }));
      // Batch par 500 pour éviter les limites
      for (let i = 0; i < snapshots.length; i += 500) {
        await db.insert(playerHistory).values(snapshots.slice(i, i + 500));
      }
    }

    // Upsert towns
    if (townsData.length > 0) {
      for (let i = 0; i < townsData.length; i += 500) {
        await db
          .insert(towns)
          .values(townsData.slice(i, i + 500))
          .onConflictDoUpdate({
            target: towns.id,
            set: {
              playerId: sql`excluded.player_id`,
              name: sql`excluded.name`,
              x: sql`excluded.x`,
              y: sql`excluded.y`,
              islandNo: sql`excluded.island_no`,
              points: sql`excluded.points`,
              updatedAt: sql`now()`,
            },
          });
      }
    }

    // Insert conquers (ignore duplicates via unique index)
    if (conquersData.length > 0) {
      await db
        .insert(conquers)
        .values(conquersData)
        .onConflictDoNothing();
    }

    // Sync islands only on first run (they rarely change)
    const islandCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(islands)
      .then((r) => Number(r[0].count));

    let islandsSynced = 0;
    if (islandCount < 10000) {
      const islandsData = await parseIslands();
      for (let i = 0; i < islandsData.length; i += 1000) {
        await db
          .insert(islands)
          .values(islandsData.slice(i, i + 1000))
          .onConflictDoNothing();
      }
      islandsSynced = islandsData.length;
    }

    return NextResponse.json({
      ok: true,
      alliances: alliancesData.length,
      players: playersData.length,
      towns: townsData.length,
      conquers: conquersData.length,
      islands: islandsSynced || `${islandCount} (already synced)`,
    });
  } catch (err) {
    console.error("[cron/sync]", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
