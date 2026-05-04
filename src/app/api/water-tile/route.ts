import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SERVER = "fr180";

export async function GET() {
  try {
    const res = await fetch(
      `https://${SERVER}.grepolis.com/images/game/map/watertiles.png`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return NextResponse.json({ error: "not found" }, { status: 404 });

    const buffer = await res.arrayBuffer();
    return new Response(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
