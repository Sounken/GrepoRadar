import { NextResponse, after } from "next/server";
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

  // Répondre immédiatement pour ne pas dépasser le timeout de cron.org (30s)
  // La sync continue en arrière-plan jusqu'à maxDuration (60s)
  after(async () => {
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

      // Upsert players (requis avant playerHistory et conquers)
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
      }

      // Parallélise playerHistory + towns + conquers
      const now = new Date();
      const snapshots = playersData.map((p) => ({
        playerId: p.id,
        points: p.points,
        rank: p.rank,
        towns: p.towns,
        allianceId: p.allianceId ?? null,
        recordedAt: now,
      }));

      await Promise.all([
        // Snapshots historique (batches de 1000)
        (async () => {
          for (let i = 0; i < snapshots.length; i += 1000) {
            await db.insert(playerHistory).values(snapshots.slice(i, i + 1000));
          }
        })(),
        // Upsert towns (batches de 1000)
        (async () => {
          for (let i = 0; i < townsData.length; i += 1000) {
            await db
              .insert(towns)
              .values(townsData.slice(i, i + 1000))
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
        })(),
        // Insert conquers (ignore duplicates via unique index)
        conquersData.length > 0
          ? db.insert(conquers).values(conquersData).onConflictDoNothing()
          : Promise.resolve(),
      ]);

      // Sync islands only on first run (they rarely change)
      const islandCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(islands)
        .then((r) => Number(r[0].count));

      if (islandCount < 10000) {
        const islandsData = await parseIslands();
        for (let i = 0; i < islandsData.length; i += 1000) {
          await db
            .insert(islands)
            .values(islandsData.slice(i, i + 1000))
            .onConflictDoNothing();
        }
      }
    } catch (err) {
      console.error("[cron/sync]", err);
    }
  });

  return NextResponse.json({ ok: true, status: "sync started" });
}
