"use client";
import { useState, useMemo } from "react";
import { useTheme } from "@/components/theme-provider";
import {
  UNITS, TIER_ORDER, type Unit, type Tier,
  attackPerPop, bestDefPerPop, defSpecialty, totalCost, assignTiers,
} from "@/lib/units-data";

type Tab = "attaque" | "defense";
type Category = "contondant" | "blanche" | "jet" | "mixte" | "navale" | "volante";

const TIER_COLOR: Record<Tier, string> = {
  S: "#f59e0b",
  A: "#22c78a",
  B: "#8b7ff5",
  C: "#6b7280",
};

const SUBTYPE_LABEL: Record<string, string> = {
  terrestre: "Terrestre",
  volante: "Volante",
  navale: "Navale",
};

const CDN = "https://tools-files.innogamescdn.com/support-knowledgebase/article/3371";
const ICONS = {
  bois:    `${CDN}/2f8905236c58d732188e7c3b8bcf1ab2`,
  pierre:  `${CDN}/644d59a3806350c37e920ba45a6e2fb6`,
  argent:  `${CDN}/82e21ce1a0878cd7364a75490f4247a1`,
  faveurs: `${CDN}/58141d5a22289048900c093a4973fc2a`,
  pop:     `${CDN}/a1d70aa2c49ae6897659600c2ef076e0`,
  atk:     `${CDN}/28d2fe4402c90ffd32a38b91f1915dd8`,
  defCoup: `${CDN}/fe9fdb080a166c5b09da822997cdcd09`,
  defLame: `${CDN}/7a1d48f455ac8e3194fc12e62050af25`,
  defJet:  `${CDN}/52f8deaafd4b27b1d503337d7c32a6ec`,
};

// Attack tab: advantage of sending attacker X against defender with high defY
// If the enemy has high defContond → send blanche/jet (they face defBlanche/defJet instead, which is lower)
const ATK_WEIGHT: Record<Category, Record<string, number>> = {
  contondant: { contondant: 0.85, blanche: 1.3, jet: 1.3, mixte: 1.0 },
  blanche:    { contondant: 1.3, blanche: 0.85, jet: 1.3, mixte: 1.0 },
  jet:        { contondant: 1.3, blanche: 1.3, jet: 0.85, mixte: 1.0 },
  mixte:      { contondant: 1.0, blanche: 1.0, jet: 1.0, mixte: 1.0 },
  navale:     {},
  volante:    {},
};

const CATEGORIES: { id: Category; labelAtk: string; labelDef: string }[] = [
  { id: "contondant", labelAtk: "Déf. Contondant", labelDef: "Att. Contondant" },
  { id: "blanche",    labelAtk: "Déf. Tranchant",  labelDef: "Att. Tranchant"  },
  { id: "jet",        labelAtk: "Déf. Distance",   labelDef: "Att. Distance"   },
  { id: "mixte",      labelAtk: "Défense Mixte",   labelDef: "Défense Mixte"   },
  { id: "navale",     labelAtk: "Navale",           labelDef: "Navale"          },
  { id: "volante",    labelAtk: "Volante",          labelDef: "Volante"         },
];

function isNavalUnit(u: Unit) {
  return u.type === "navale" || u.subtype === "navale";
}
function isVolanteUnit(u: Unit) {
  return u.subtype === "volante";
}

function filterUnits(units: Unit[], category: Category): Unit[] {
  const nonSiege = units.filter((u) => !u.isSiege);
  if (category === "navale") return nonSiege.filter(isNavalUnit);
  if (category === "volante") return nonSiege.filter(isVolanteUnit);
  // All other categories: every non-naval unit (terrestres + volantes + mythologiques terrestres)
  return nonSiege.filter((u) => !isNavalUnit(u));
}

function getScorer(category: Category, tab: Tab, maxSpeed: number) {
  if (tab === "attaque") {
    if (category === "navale") return attackPerPop;
    if (category === "volante")
      return (u: Unit) => attackPerPop(u) * (1 + u.speed / maxSpeed * 0.5);
    // Weighted by attacker type vs defender defense composition
    return (u: Unit) => {
      const w = ATK_WEIGHT[category][u.attackType ?? "mixte"] ?? 1.0;
      return attackPerPop(u) * w;
    };
  }
  // Defense tab
  switch (category) {
    case "contondant": return (u: Unit) => u.pop > 0 ? u.defContond / u.pop : 0;
    case "blanche":    return (u: Unit) => u.pop > 0 ? u.defBlanche / u.pop : 0;
    case "jet":        return (u: Unit) => u.pop > 0 ? u.defJet / u.pop : 0;
    case "navale":     return (u: Unit) => u.pop > 0 ? u.defContond / u.pop : 0;
    case "volante":    return (u: Unit) => bestDefPerPop(u) * (1 + u.speed / maxSpeed * 0.5);
    default:           return (u: Unit) => u.pop > 0 ? (u.defContond + u.defBlanche + u.defJet) / 3 / u.pop : 0;
  }
}

function ResIcon({ src, value }: { src: string; value: number }) {
  const { t } = useTheme();
  if (value === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      <img src={src} alt="" style={{ width: 16, height: 16, objectFit: "contain" }} />
      <span style={{ fontSize: 11, fontWeight: 600, color: t.text, fontFamily: "var(--font-dm-mono), monospace" }}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}

function StatBar({ iconSrc, label, value, max, color, star }: {
  iconSrc: string; label: string; value: number; max: number; color: string; star?: boolean;
}) {
  const { t } = useTheme();
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }} title={label}>
      <img src={iconSrc} alt={label} style={{ width: 16, height: 16, objectFit: "contain", flexShrink: 0 }} />
      <div style={{ flex: 1, height: 5, background: t.border, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.3s" }} />
      </div>
      <span style={{
        fontSize: 11, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace",
        color: star ? color : t.textMid, width: 34, textAlign: "right",
      }}>
        {value}{star ? " ★" : ""}
      </span>
    </div>
  );
}

function UnitCard({ unit, tab, maxAtk, maxDef }: {
  unit: Unit; tab: Tab; maxAtk: number; maxDef: number;
}) {
  const { t } = useTheme();
  const [imgOk, setImgOk] = useState(true);
  const cost = totalCost(unit);
  const atkPop = attackPerPop(unit);
  const defPop = bestDefPerPop(unit);
  const specialty = defSpecialty(unit);
  const isNavale = isNavalUnit(unit);

  return (
    <div style={{
      background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12,
      padding: "12px", display: "flex", flexDirection: "column", gap: 10,
      width: 230, flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ width: 44, height: 44, flexShrink: 0, position: "relative", borderRadius: 8, overflow: "hidden", background: t.lavender }}>
          <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
            {unit.emoji}
          </span>
          {imgOk && unit.imageUrl && (
            <img
              src={unit.imageUrl}
              alt={unit.name}
              onError={() => setImgOk(false)}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
            />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: t.text, lineHeight: 1.2 }}>{unit.name}</div>
          <div style={{ fontSize: 10, color: t.textDim, marginTop: 2 }}>
            {unit.subtype ? SUBTYPE_LABEL[unit.subtype] : unit.type === "navale" ? "Navale" : "Terrestre"}
            {unit.divinite && <span style={{ marginLeft: 6, color: t.accent }}>· {unit.divinite}</span>}
          </div>
          {unit.note && (
            <div style={{ fontSize: 9, color: t.textDim, marginTop: 3, lineHeight: 1.3, fontStyle: "italic" }}>
              {unit.note}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 8px", padding: "6px 8px", background: t.bg, borderRadius: 8 }}>
        <ResIcon src={ICONS.bois} value={unit.bois} />
        <ResIcon src={ICONS.pierre} value={unit.pierre} />
        <ResIcon src={ICONS.argent} value={unit.argent} />
        {unit.faveurs != null && <ResIcon src={ICONS.faveurs} value={unit.faveurs} />}
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <img src={ICONS.pop} alt="Population" style={{ width: 16, height: 16, objectFit: "contain" }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: t.accent, fontFamily: "var(--font-dm-mono), monospace" }}>×{unit.pop}</span>
        </div>
      </div>

      {tab === "attaque" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <StatBar iconSrc={ICONS.atk} label="Attaque" value={unit.attack} max={maxAtk} color={t.red} />
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <div style={{ flex: 1, background: t.red + "15", border: `1px solid ${t.red}33`, borderRadius: 7, padding: "5px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: t.red, fontFamily: "var(--font-dm-mono), monospace", lineHeight: 1 }}>
                {atkPop.toFixed(atkPop >= 10 ? 0 : 1)}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, marginTop: 3 }}>
                <img src={ICONS.atk} alt="" style={{ width: 12, height: 12, objectFit: "contain" }} />
                <span style={{ fontSize: 9, color: t.textDim }}>par</span>
                <img src={ICONS.pop} alt="" style={{ width: 12, height: 12, objectFit: "contain" }} />
              </div>
            </div>
            <div style={{ flex: 1, background: t.lavender, border: `1px solid ${t.lavenderMid}`, borderRadius: 7, padding: "5px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.lavenderDeep, fontFamily: "var(--font-dm-mono), monospace", lineHeight: 1 }}>
                {cost.toLocaleString()}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, marginTop: 3 }}>
                <img src={ICONS.bois} alt="" style={{ width: 12, height: 12, objectFit: "contain" }} />
                <img src={ICONS.pierre} alt="" style={{ width: 12, height: 12, objectFit: "contain" }} />
                <img src={ICONS.argent} alt="" style={{ width: 12, height: 12, objectFit: "contain" }} />
                <span style={{ fontSize: 9, color: t.textDim }}>/ unité</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {isNavale ? (
            <StatBar iconSrc={ICONS.defCoup} label="Déf navale" value={unit.defContond} max={maxDef} color="#8b7ff5" />
          ) : (
            <>
              <StatBar iconSrc={ICONS.defCoup} label="Contondant" value={unit.defContond} max={maxDef} color="#f59e0b" star={specialty === "Contondant"} />
              <StatBar iconSrc={ICONS.defLame} label="Tranchant"  value={unit.defBlanche} max={maxDef} color="#22c78a" star={specialty === "Tranchant"} />
              <StatBar iconSrc={ICONS.defJet}  label="Distance"   value={unit.defJet}     max={maxDef} color="#8b7ff5" star={specialty === "Jet"} />
            </>
          )}
          <div style={{ marginTop: 4, background: t.lavender, border: `1px solid ${t.lavenderMid}`, borderRadius: 7, padding: "5px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 9, color: t.textDim }}>★</span>
              <img
                src={isNavale ? ICONS.defCoup : specialty === "Contondant" ? ICONS.defCoup : specialty === "Tranchant" ? ICONS.defLame : ICONS.defJet}
                alt="" style={{ width: 14, height: 14, objectFit: "contain" }}
              />
              <span style={{ fontSize: 9, color: t.textDim }}>par</span>
              <img src={ICONS.pop} alt="" style={{ width: 14, height: 14, objectFit: "contain" }} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: t.lavenderDeep, fontFamily: "var(--font-dm-mono), monospace" }}>
              {defPop.toFixed(defPop >= 10 ? 0 : 1)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function TierRow({ tier, units, tab, maxAtk, maxDef, tiers }: {
  tier: Tier; units: Unit[]; tab: Tab; maxAtk: number; maxDef: number; tiers: Map<string, Tier>;
}) {
  const { t } = useTheme();
  const filtered = units.filter((u) => tiers.get(u.id) === tier);
  if (filtered.length === 0) return null;
  const color = TIER_COLOR[tier];

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9, background: color + "22",
          border: `2px solid ${color}`, display: "flex", alignItems: "center",
          justifyContent: "center", fontWeight: 900, fontSize: 16, color, flexShrink: 0,
        }}>
          {tier}
        </div>
        <div style={{ fontSize: 11, color: t.textDim }}>
          {tier === "S" ? "Excellent — meilleur rapport dans cette catégorie"
           : tier === "A" ? "Bon — très efficace"
           : tier === "B" ? "Correct — à utiliser selon la situation"
           : "Situationnel — rôle spécifique"}
        </div>
        <div style={{ flex: 1, height: 1, background: color + "33" }} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {filtered.map((u) => (
          <UnitCard key={u.id} unit={u} tab={tab} maxAtk={maxAtk} maxDef={maxDef} />
        ))}
      </div>
    </div>
  );
}

export function TroupesClient() {
  const { t } = useTheme();
  const [tab, setTab] = useState<Tab>("attaque");
  const [category, setCategory] = useState<Category>("contondant");

  const maxSpeed = useMemo(() => Math.max(...UNITS.map((u) => u.speed), 1), []);

  const visibleUnits = useMemo(
    () => filterUnits(UNITS, category),
    [category],
  );

  const siegeUnits = useMemo(() => UNITS.filter((u) => u.isSiege), []);

  const scorer = useMemo(
    () => getScorer(category, tab, maxSpeed),
    [category, tab, maxSpeed],
  );

  const tiers = useMemo(() => assignTiers(visibleUnits, scorer), [visibleUnits, scorer]);

  const maxAtk = useMemo(
    () => Math.max(...visibleUnits.map((u) => u.attack), 1),
    [visibleUnits],
  );
  const maxDef = useMemo(
    () => Math.max(...visibleUnits.flatMap((u) => [u.defContond, u.defBlanche, u.defJet]), 1),
    [visibleUnits],
  );

  const showSiege = tab === "attaque" && category !== "navale" && category !== "volante";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 24px 12px", borderBottom: `1px solid ${t.border}`, background: t.bgCard, flexShrink: 0 }}>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: t.text, letterSpacing: -0.3 }}>⚔ Guide des troupes</h1>
        <div style={{ color: t.textLight, fontSize: 11, marginTop: 1 }}>
          Tiers calculés au sein de chaque catégorie — efficacité par population (FR180)
        </div>
      </div>

      {/* Tabs + Categories */}
      <div style={{
        padding: "10px 24px", borderBottom: `1px solid ${t.border}`,
        background: t.bgCard, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", flexShrink: 0,
      }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(["attaque", "defense"] as Tab[]).map((v) => (
            <button key={v} onClick={() => setTab(v)} style={{
              padding: "7px 20px", borderRadius: 8,
              border: `1px solid ${tab === v ? t.accent : t.border}`,
              background: tab === v ? t.accent + "18" : "transparent",
              color: tab === v ? t.accent : t.textMid,
              fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}>
              {v === "attaque" ? "⚔ Attaque" : "🛡 Défense"}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 24, background: t.border }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CATEGORIES.map((cat) => (
            <button key={cat.id} onClick={() => setCategory(cat.id)} style={{
              padding: "4px 12px", borderRadius: 6,
              border: `1px solid ${category === cat.id ? t.lavenderDeep : t.border}`,
              background: category === cat.id ? t.lavender : "transparent",
              color: category === cat.id ? t.lavenderDeep : t.textDim,
              fontWeight: 500, fontSize: 11, cursor: "pointer",
            }}>
              {tab === "attaque" ? cat.labelAtk : cat.labelDef}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
        {visibleUnits.length === 0 ? (
          <div style={{ color: t.textDim, fontSize: 13, textAlign: "center", marginTop: 40 }}>
            Aucune unité dans cette catégorie
          </div>
        ) : (
          TIER_ORDER.map((tier) => (
            <TierRow key={tier} tier={tier} units={visibleUnits} tab={tab} maxAtk={maxAtk} maxDef={maxDef} tiers={tiers} />
          ))
        )}

        {showSiege && siegeUnits.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{
                borderRadius: 9, background: "#37415122", border: "2px solid #374151",
                display: "flex", alignItems: "center", padding: "4px 10px",
                fontWeight: 700, fontSize: 12, color: "#6b7280", gap: 6, flexShrink: 0,
              }}>
                🏰 Siège
              </div>
              <div style={{ fontSize: 11, color: t.textDim }}>Réducteurs de remparts — ne ciblent pas les unités</div>
              <div style={{ flex: 1, height: 1, background: t.border }} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {siegeUnits.map((u) => (
                <UnitCard key={u.id} unit={u} tab={tab} maxAtk={maxAtk} maxDef={maxDef} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
