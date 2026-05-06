const CDN = "https://tools-files.innogamescdn.com/support-knowledgebase/article/3371";

export type UnitType = "terrestre" | "navale" | "mythologique";
export type Subtype = "terrestre" | "navale" | "volante";
export type AttackType = "contondant" | "blanche" | "jet" | "mixte";

export type Unit = {
  id: string;
  name: string;
  emoji: string;
  imageUrl: string;
  type: UnitType;
  subtype?: Subtype;
  divinite?: string;
  attackType?: AttackType;
  bois: number;
  pierre: number;
  argent: number;
  faveurs?: number;
  pop: number;
  attack: number;
  defContond: number;
  defBlanche: number;
  defJet: number;
  speed: number;
  isSiege?: boolean;
  note?: string;
};

export const UNITS: Unit[] = [
  // ── Terrestres régulières ────────────────────────────────────
  {
    id: "frondeur", name: "Frondeur", emoji: "🪃",
    imageUrl: `${CDN}/848b1ac7139d217cf7a94c812742f703`,
    type: "terrestre", attackType: "contondant",
    bois: 55, pierre: 100, argent: 40, pop: 1,
    attack: 23, defContond: 7, defBlanche: 8, defJet: 2, speed: 14,
  },
  {
    id: "epeiste", name: "Épéiste", emoji: "⚔️",
    imageUrl: `${CDN}/fa741bcec6c0f0ce6fb0587602c973ae`,
    type: "terrestre", attackType: "blanche",
    bois: 95, pierre: 0, argent: 85, pop: 1,
    attack: 5, defContond: 14, defBlanche: 8, defJet: 30, speed: 8,
  },
  {
    id: "archer", name: "Archer", emoji: "🏹",
    imageUrl: `${CDN}/7dc52fd8553267b1aa1f76c497f8bff8`,
    type: "terrestre", attackType: "jet",
    bois: 120, pierre: 0, argent: 75, pop: 1,
    attack: 8, defContond: 7, defBlanche: 25, defJet: 13, speed: 12,
  },
  {
    id: "hoplite", name: "Hoplite", emoji: "🛡️",
    imageUrl: `${CDN}/d1a9a9e693800314df1bff317d645ca1`,
    type: "terrestre", attackType: "contondant",
    bois: 0, pierre: 75, argent: 150, pop: 1,
    attack: 16, defContond: 18, defBlanche: 12, defJet: 7, speed: 6,
  },
  {
    id: "cavalier", name: "Cavalier", emoji: "🐴",
    imageUrl: `${CDN}/f27b582ce7382a368619e0f490bff17d`,
    type: "terrestre", attackType: "blanche",
    bois: 240, pierre: 120, argent: 360, pop: 3,
    attack: 60, defContond: 18, defBlanche: 1, defJet: 24, speed: 22,
    note: "Nécessite des chevaux sur l'île",
  },
  {
    id: "char", name: "Char", emoji: "🪖",
    imageUrl: `${CDN}/1d7414262119db0369b080b8bdb4f136`,
    type: "terrestre", attackType: "contondant",
    bois: 200, pierre: 440, argent: 320, pop: 4,
    attack: 56, defContond: 76, defBlanche: 16, defJet: 56, speed: 18,
  },
  {
    id: "catapulte", name: "Catapulte", emoji: "💣",
    imageUrl: `${CDN}/f7e41b09820a7d53c862024583e8693a`,
    type: "terrestre",
    bois: 700, pierre: 700, argent: 700, pop: 15,
    attack: 100, defContond: 30, defBlanche: 30, defJet: 30, speed: 2,
    isSiege: true, note: "Réduit les remparts adverses",
  },
  // ── Navales régulières ───────────────────────────────────────
  {
    id: "bireme", name: "Birème", emoji: "⛵",
    imageUrl: `${CDN}/f380d24376ca020981906f88efd26e50`,
    type: "navale",
    bois: 800, pierre: 700, argent: 180, pop: 8,
    attack: 24, defContond: 160, defBlanche: 0, defJet: 0, speed: 15,
    note: "Défense navale — escorte les transports",
  },
  {
    id: "bateau-feu", name: "Bateau-feu", emoji: "🔥",
    imageUrl: `${CDN}/a95ce16f0594c5165f774273d55c25da`,
    type: "navale",
    bois: 1300, pierre: 300, argent: 800, pop: 10,
    attack: 200, defContond: 60, defBlanche: 0, defJet: 0, speed: 13,
    note: "Détruit les défenses navales — se sacrifie",
  },
  {
    id: "triere", name: "Trière", emoji: "🚢",
    imageUrl: `${CDN}/11b71715c6fae39fc5115b10069689ed`,
    type: "navale",
    bois: 2000, pierre: 1300, argent: 1300, pop: 16,
    attack: 250, defContond: 250, defBlanche: 0, defJet: 0, speed: 15,
    note: "Unité navale polyvalente haut de gamme",
  },
  // ── Mythologiques terrestres ─────────────────────────────────
  {
    id: "envoye-divin", name: "Envoyé divin", emoji: "✨",
    imageUrl: `${CDN}/ed911343410701331db84f07755c73cc`,
    type: "mythologique", subtype: "terrestre", divinite: "Toutes",
    attackType: "mixte",
    bois: 0, pierre: 0, argent: 0, faveurs: 12, pop: 3,
    attack: 45, defContond: 40, defBlanche: 40, defJet: 40, speed: 16,
    note: "Disponible avec n'importe quelle divinité",
  },
  {
    id: "centaure", name: "Centaure", emoji: "🏇",
    imageUrl: `${CDN}/d7d657379ee3eae3ab67a82a0264568c`,
    type: "mythologique", subtype: "terrestre", divinite: "Athéna",
    attackType: "blanche",
    bois: 2300, pierre: 400, argent: 900, faveurs: 70, pop: 12,
    attack: 134, defContond: 195, defBlanche: 585, defJet: 80, speed: 18,
  },
  {
    id: "cerbere", name: "Cerbère", emoji: "🐺",
    imageUrl: `${CDN}/f3049556ae2af86e055fadf47163e7dc`,
    type: "mythologique", subtype: "terrestre", divinite: "Hadès",
    attackType: "contondant",
    bois: 1950, pierre: 2350, argent: 4700, faveurs: 180, pop: 30,
    attack: 210, defContond: 825, defBlanche: 300, defJet: 1575, speed: 4,
  },
  {
    id: "cyclope", name: "Cyclope", emoji: "👁️",
    imageUrl: `${CDN}/ac146bdd6ba8c3e6bfaafec83d60cb48`,
    type: "mythologique", subtype: "terrestre", divinite: "Poséidon",
    attackType: "contondant",
    bois: 3000, pierre: 5000, argent: 4000, faveurs: 240, pop: 40,
    attack: 1035, defContond: 1050, defBlanche: 10, defJet: 1450, speed: 8,
  },
  {
    id: "erinye", name: "Érinye", emoji: "👿",
    imageUrl: `${CDN}/5ba7d579f90e8ba92efb320c18482e44`,
    type: "mythologique", subtype: "terrestre", divinite: "Hadès",
    attackType: "blanche",
    bois: 3300, pierre: 6600, argent: 6600, faveurs: 330, pop: 55,
    attack: 1700, defContond: 460, defBlanche: 460, defJet: 595, speed: 10,
  },
  {
    id: "meduse", name: "Méduse", emoji: "🐍",
    imageUrl: `${CDN}/47791e7ca6ada767d596c21497f2f9c3`,
    type: "mythologique", subtype: "terrestre", divinite: "Héra",
    attackType: "mixte",
    bois: 1100, pierre: 2700, argent: 1600, faveurs: 110, pop: 18,
    attack: 425, defContond: 480, defBlanche: 345, defJet: 290, speed: 6,
    note: "Paralyse les unités adverses",
  },
  {
    id: "minotaure", name: "Minotaure", emoji: "🐂",
    imageUrl: `${CDN}/cee4a28e221aea1c085999de414b8d66`,
    type: "mythologique", subtype: "terrestre", divinite: "Zeus",
    attackType: "contondant",
    bois: 2500, pierre: 1050, argent: 5450, faveurs: 180, pop: 30,
    attack: 650, defContond: 750, defBlanche: 330, defJet: 640, speed: 10,
  },
  {
    id: "sanglier", name: "Sanglier de Calydon", emoji: "🐗",
    imageUrl: `${CDN}/87529a3f5ae3445cc79abb215d8803fd`,
    type: "mythologique", subtype: "terrestre", divinite: "Artémis",
    attackType: "contondant",
    bois: 2900, pierre: 1500, argent: 1600, faveurs: 120, pop: 20,
    attack: 180, defContond: 700, defBlanche: 700, defJet: 100, speed: 16,
  },
  {
    id: "satyre", name: "Satyre", emoji: "🎭",
    imageUrl: `${CDN}/9786cacff69305db267611197756f60b`,
    type: "mythologique", subtype: "terrestre", divinite: "Aphrodite",
    attackType: "blanche",
    bois: 1450, pierre: 750, argent: 2600, faveurs: 95, pop: 16,
    attack: 385, defContond: 55, defBlanche: 105, defJet: 170, speed: 136,
    note: "Vitesse exceptionnelle",
  },
  {
    id: "sparte", name: "Sparte", emoji: "⚡",
    imageUrl: `${CDN}/4ebff31cc8914ebc62b505dd097a3e7d`,
    type: "mythologique", subtype: "terrestre", divinite: "Arès",
    attackType: "contondant",
    bois: 1000, pierre: 975, argent: 1025, faveurs: 60, pop: 10,
    attack: 205, defContond: 100, defBlanche: 100, defJet: 150, speed: 16,
  },
  // ── Mythologiques volantes ───────────────────────────────────
  {
    id: "harpie", name: "Harpie", emoji: "🦅",
    imageUrl: `${CDN}/4bf098aa7efeab851f2dc27841bc9ff3`,
    type: "mythologique", subtype: "volante", divinite: "Héra",
    bois: 2000, pierre: 500, argent: 1700, faveurs: 85, pop: 14,
    attack: 295, defContond: 105, defBlanche: 70, defJet: 1, speed: 28,
  },
  {
    id: "manticore", name: "Manticore", emoji: "🦁",
    imageUrl: `${CDN}/08518b5604dae954a8b09ed7d9b21bab`,
    type: "mythologique", subtype: "volante", divinite: "Zeus",
    bois: 5500, pierre: 3750, argent: 4250, faveurs: 270, pop: 45,
    attack: 1010, defContond: 170, defBlanche: 225, defJet: 505, speed: 22,
  },
  {
    id: "pegase", name: "Pégase", emoji: "🦄",
    imageUrl: `${CDN}/4bba7685df297de709e24cebf6c466bc`,
    type: "mythologique", subtype: "volante", divinite: "Athéna",
    bois: 4000, pierre: 1300, argent: 700, faveurs: 120, pop: 20,
    attack: 100, defContond: 750, defBlanche: 275, defJet: 275, speed: 35,
    note: "Très rapide — excellent en défense",
  },
  {
    id: "griffon", name: "Griffon", emoji: "🦁",
    imageUrl: `${CDN}/e2680bb6de76e2d5827a4846d8d423cc`,
    type: "mythologique", subtype: "volante", divinite: "Artémis",
    bois: 4100, pierre: 2100, argent: 5200, faveurs: 230, pop: 35,
    attack: 900, defContond: 320, defBlanche: 330, defJet: 100, speed: 18,
  },
  {
    id: "ladon", name: "Ladon", emoji: "🐉",
    imageUrl: `${CDN}/19494534b50ca49396b997eb13ed5105`,
    type: "mythologique", subtype: "volante", divinite: "Arès",
    bois: 21000, pierre: 21500, argent: 20500, faveurs: 490, pop: 85,
    attack: 2530, defContond: 2390, defBlanche: 1950, defJet: 2100, speed: 100,
    note: "Unité la plus puissante du jeu",
  },
  // ── Mythologiques navales ────────────────────────────────────
  {
    id: "hydre", name: "Hydre", emoji: "🐲",
    imageUrl: `${CDN}/b348c378926c7b1f41811d475686d360`,
    type: "mythologique", subtype: "navale", divinite: "Poséidon",
    bois: 6750, pierre: 3500, argent: 4750, faveurs: 300, pop: 50,
    attack: 1310, defContond: 1400, defBlanche: 0, defJet: 0, speed: 8,
  },
  {
    id: "hydre-sirene", name: "Hydre Sirène", emoji: "🧜",
    imageUrl: `${CDN}/d207851dcda749446d739793d01dbfc8`,
    type: "mythologique", subtype: "navale", divinite: "Aphrodite",
    bois: 1700, pierre: 1300, argent: 2200, faveurs: 110, pop: 16,
    attack: 180, defContond: 170, defBlanche: 0, defJet: 0, speed: 22,
  },
];

export function totalCost(u: Unit) {
  return u.bois + u.pierre + u.argent;
}

export function attackPerPop(u: Unit) {
  return u.pop > 0 ? u.attack / u.pop : 0;
}

export function bestDef(u: Unit) {
  return Math.max(u.defContond, u.defBlanche, u.defJet);
}

export function bestDefPerPop(u: Unit) {
  return u.pop > 0 ? bestDef(u) / u.pop : 0;
}

export function defSpecialty(u: Unit): "Contondant" | "Tranchant" | "Jet" {
  const m = bestDef(u);
  if (m === u.defContond) return "Contondant";
  if (m === u.defBlanche) return "Tranchant";
  return "Jet";
}

export type Tier = "S" | "A" | "B" | "C";
export const TIER_ORDER: Tier[] = ["S", "A", "B", "C"];

export function assignTiers(
  units: Unit[],
  scorer: (u: Unit) => number,
): Map<string, Tier> {
  const scores = units.map((u) => ({ id: u.id, s: scorer(u) }));
  const max = Math.max(...scores.map((x) => x.s), 1);
  const result = new Map<string, Tier>();
  for (const { id, s } of scores) {
    const pct = (s / max) * 100;
    result.set(id, pct >= 75 ? "S" : pct >= 50 ? "A" : pct >= 25 ? "B" : "C");
  }
  return result;
}
