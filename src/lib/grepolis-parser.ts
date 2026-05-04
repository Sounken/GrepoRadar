const SERVER = "fr180";
const BASE_URL = `https://${SERVER}.grepolis.com/data`;

async function fetchFile(name: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/${name}.txt`, {
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${name}.txt: ${res.status}`);
  return res.text();
}

function decode(s: string): string {
  return decodeURIComponent(s.replace(/\+/g, " "));
}

export async function parsePlayers() {
  const raw = await fetchFile("players");
  return raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [id, name, allianceId, points, rank, towns] = line.split(",");
      return {
        id: parseInt(id),
        name: decode(name),
        allianceId: allianceId ? parseInt(allianceId) : null,
        points: parseInt(points) || 0,
        rank: parseInt(rank) || 0,
        towns: parseInt(towns) || 0,
      };
    });
}

export async function parseTowns() {
  const raw = await fetchFile("towns");
  return raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [id, playerId, name, x, y, islandNo, points] = line.split(",");
      return {
        id: parseInt(id),
        playerId: playerId ? parseInt(playerId) : null,
        name: decode(name),
        x: parseInt(x),
        y: parseInt(y),
        islandNo: parseInt(islandNo) || 0,
        points: parseInt(points) || 0,
      };
    });
}

export async function parseAlliances() {
  const raw = await fetchFile("alliances");
  return raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [id, name, points, rank, members, towns] = line.split(",");
      return {
        id: parseInt(id),
        name: decode(name),
        points: parseInt(points) || 0,
        rank: parseInt(rank) || 0,
        members: parseInt(members) || 0,
        towns: parseInt(towns) || 0,
      };
    });
}

export async function parseIslands() {
  const raw = await fetchFile("islands");
  return raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [id, x, y, type] = line.split(",");
      return {
        id: parseInt(id),
        x: parseInt(x),
        y: parseInt(y),
        type: parseInt(type) || 1,
      };
    });
}

export async function parseConquers() {
  const raw = await fetchFile("conquers");
  return raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(",");
      // format: town_id, new_player_id, old_player_id, new_ally_id, old_ally_id, ?, timestamp
      const townId = parseInt(parts[0]);
      const newPlayerId = parts[1] ? parseInt(parts[1]) : null;
      const oldPlayerId = parts[2] ? parseInt(parts[2]) : null;
      const newAllianceId = parts[3] ? parseInt(parts[3]) : null;
      const oldAllianceId = parts[4] ? parseInt(parts[4]) : null;
      // timestamp is unix seconds in the last field
      const tsRaw = parseInt(parts[parts.length - 1]);
      const capturedAt = new Date(tsRaw * 1000);
      return { townId, newPlayerId, oldPlayerId, newAllianceId, oldAllianceId, capturedAt };
    })
    .filter((c) => !isNaN(c.townId) && c.capturedAt.getFullYear() > 2000);
}
