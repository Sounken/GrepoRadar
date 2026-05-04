import { NextResponse } from "next/server";
import { db } from "@/db";
import { islands, towns } from "@/db/schema";
import { and, between } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const xMin = Math.max(0, parseInt(searchParams.get("xMin") ?? "0"));
  const xMax = Math.min(999, parseInt(searchParams.get("xMax") ?? "999"));
  const yMin = Math.max(0, parseInt(searchParams.get("yMin") ?? "0"));
  const yMax = Math.min(999, parseInt(searchParams.get("yMax") ?? "999"));

  try {
    const [islandData, townCoords] = await Promise.all([
      db
        .select({ x: islands.x, y: islands.y, type: islands.type })
        .from(islands)
        .where(and(between(islands.x, xMin, xMax), between(islands.y, yMin, yMax))),
      db
        .selectDistinct({ x: towns.x, y: towns.y })
        .from(towns)
        .where(and(between(towns.x, xMin, xMax), between(towns.y, yMin, yMax))),
    ]);

    const inhabitedSet = new Set(townCoords.map((t) => `${t.x}_${t.y}`));
    const data = islandData.map((i) => ({
      ...i,
      inhabited: inhabitedSet.has(`${i.x}_${i.y}`),
    }));

    return NextResponse.json({ islands: data });
  } catch {
    return NextResponse.json({ islands: [] });
  }
}
