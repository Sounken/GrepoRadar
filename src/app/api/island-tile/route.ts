import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SERVER = "fr180";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const rawPrefix = searchParams.get("prefix") ?? "uninhabited";
  const prefix = rawPrefix === "island" ? "island" : "uninhabited";
  // type is already normalized by the client; just clamp to valid range
  const type = Math.max(1, parseInt(searchParams.get("type") ?? "1") || 1);

  try {
    const res = await fetch(
      `https://${SERVER}.grepolis.com/images/game/map/${prefix}${type}.png`,
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
