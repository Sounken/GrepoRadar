import {
  pgTable,
  integer,
  bigint,
  varchar,
  text,
  smallint,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const alliances = pgTable(
  "alliances",
  {
    id: integer("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    points: integer("points").notNull().default(0),
    rank: smallint("rank").notNull().default(0),
    members: smallint("members").notNull().default(0),
    towns: smallint("towns").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  }
);

export const players = pgTable(
  "players",
  {
    id: integer("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    allianceId: integer("alliance_id"),
    points: integer("points").notNull().default(0),
    rank: smallint("rank").notNull().default(0),
    towns: smallint("towns").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("players_alliance_idx").on(t.allianceId)]
);

export const towns = pgTable(
  "towns",
  {
    id: integer("id").primaryKey(),
    playerId: integer("player_id"),
    name: varchar("name", { length: 255 }).notNull(),
    x: smallint("x").notNull(),
    y: smallint("y").notNull(),
    islandNo: smallint("island_no").notNull().default(0),
    points: integer("points").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("towns_player_idx").on(t.playerId),
    index("towns_coords_idx").on(t.x, t.y),
  ]
);

export const conquers = pgTable(
  "conquers",
  {
    // Grepolis conquer id: town_id + timestamp composite
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    townId: integer("town_id").notNull(),
    newPlayerId: integer("new_player_id"),
    oldPlayerId: integer("old_player_id"),
    newAllianceId: integer("new_alliance_id"),
    oldAllianceId: integer("old_alliance_id"),
    capturedAt: timestamp("captured_at").notNull(),
  },
  (t) => [
    uniqueIndex("conquers_unique_idx").on(t.townId, t.capturedAt),
    index("conquers_town_idx").on(t.townId),
    index("conquers_new_player_idx").on(t.newPlayerId),
    index("conquers_captured_idx").on(t.capturedAt),
  ]
);

// Snapshot toutes les 30min pour les graphiques d'évolution
export const islands = pgTable(
  "islands",
  {
    id: integer("id").primaryKey(),
    x: smallint("x").notNull(),
    y: smallint("y").notNull(),
    type: smallint("type").notNull(),
  },
  (t) => [index("islands_coords_idx").on(t.x, t.y)]
);

export const playerHistory = pgTable(
  "player_history",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    playerId: integer("player_id").notNull(),
    points: integer("points").notNull(),
    rank: smallint("rank").notNull(),
    towns: smallint("towns").notNull(),
    recordedAt: timestamp("recorded_at").notNull().defaultNow(),
  },
  (t) => [
    index("player_history_player_idx").on(t.playerId),
    index("player_history_recorded_idx").on(t.recordedAt),
  ]
);

export type Alliance = typeof alliances.$inferSelect;
export type Player = typeof players.$inferSelect;
export type Town = typeof towns.$inferSelect;
export type Conquer = typeof conquers.$inferSelect;
export type Island = typeof islands.$inferSelect;
export type PlayerHistory = typeof playerHistory.$inferSelect;
