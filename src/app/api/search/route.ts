import { NextResponse } from "next/server";
import { db } from "@/db";
import { players, towns } from "@/db/schema";
import { ilike, sql, or } from "drizzle-orm";

export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ players: [], towns: [] });
  }

  const pattern = `%${q}%`;

  const [foundPlayers, foundTowns] = await Promise.all([
    db
      .select({ id: players.id, name: players.name, points: players.points, rank: players.rank })
      .from(players)
      .where(ilike(players.name, pattern))
      .orderBy(sql`${players.points} desc`)
      .limit(8),

    db
      .select({ id: towns.id, name: towns.name, x: towns.x, y: towns.y, playerId: towns.playerId })
      .from(towns)
      .where(ilike(towns.name, pattern))
      .limit(5),
  ]);

  return NextResponse.json({ players: foundPlayers, towns: foundTowns });
}
