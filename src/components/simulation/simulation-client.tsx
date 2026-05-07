"use client";
import { useState, useMemo } from "react";
import { useTheme } from "@/components/theme-provider";
import {
  UNITS, TIER_ORDER, type Unit, type Tier,
  attackPerPop, bestDefPerPop, defSpecialty, totalCost, assignTiers,
} from "@/lib/units-data";

type SimMode = "attaque" | "defense";

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function isNavalUnit(u: Unit) { return u.type === "navale" || u.subtype === "navale"; }

// All non-naval, non-siege units eligible for simulation
const SIM_UNITS = UNITS.filter((u) => !u.isSiege && !isNavalUnit(u));

const SIM_GROUPS = [
  { label: "Terrestres",               units: SIM_UNITS.filter((u) => u.type === "terrestre") },
  { label: "Mythologiques terrestres", units: SIM_UNITS.filter((u) => u.type === "mythologique" && u.subtype === "terrestre") },
  { label: "Mythologiques volants",    units: SIM_UNITS.filter((u) => u.subtype === "volante") },
];

// ── Scoring ───────────────────────────────────────────────────────────────────

function simAttackScore(attacker: Unit, enemyCounts: Record<string, number>): number {
  let totalDefX = 0, totalPop = 0;
  for (const [id, cnt] of Object.entries(enemyCounts)) {
    if (!cnt) continue;
    const u = UNITS.find((x) => x.id === id);
    if (!u) continue;
    const def =
      attacker.attackType === "contondant" ? u.defContond :
      attacker.attackType === "blanche"    ? u.defBlanche :
      attacker.attackType === "jet"        ? u.defJet :
      (u.defContond + u.defBlanche + u.defJet) / 3;
    totalDefX += def * cnt;
    totalPop  += u.pop * cnt;
  }
  if (!totalPop) return attackPerPop(attacker);
  const avgDef = totalDefX / totalPop;
  return avgDef > 0 ? (attacker.attack / attacker.pop) / avgDef : attackPerPop(attacker);
}

function simDefenseScore(defender: Unit, enemyCounts: Record<string, number>): number {
  let atkC = 0, atkB = 0, atkJ = 0, total = 0;
  for (const [id, cnt] of Object.entries(enemyCounts)) {
    if (!cnt) continue;
    const u = UNITS.find((x) => x.id === id);
    if (!u) continue;
    const a = u.attack * cnt;
    if      (u.attackType === "contondant") atkC += a;
    else if (u.attackType === "blanche")    atkB += a;
    else if (u.attackType === "jet")        atkJ += a;
    else { atkC += a / 3; atkB += a / 3; atkJ += a / 3; }
    total += a;
  }
  if (!total) return 0;
  const wDef =
    defender.defContond * (atkC / total) +
    defender.defBlanche * (atkB / total) +
    defender.defJet     * (atkJ / total);
  return defender.pop > 0 ? wDef / defender.pop : 0;
}

// ── Components ────────────────────────────────────────────────────────────────

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
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-dm-mono), monospace", color: star ? color : t.textMid, width: 34, textAlign: "right" }}>
        {value}{star ? " ★" : ""}
      </span>
    </div>
  );
}

function UnitCard({ unit, mode, maxAtk, maxDef }: { unit: Unit; mode: SimMode; maxAtk: number; maxDef: number }) {
  const { t } = useTheme();
  const [imgOk, setImgOk] = useState(true);
  const atkPop = attackPerPop(unit);
  const defPop = bestDefPerPop(unit);
  const specialty = defSpecialty(unit);

  return (
    <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px", display: "flex", flexDirection: "column", gap: 10, width: 230, flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ width: 44, height: 44, flexShrink: 0, position: "relative", borderRadius: 8, overflow: "hidden", background: t.lavender }}>
          <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{unit.emoji}</span>
          {imgOk && unit.imageUrl && (
            <img src={unit.imageUrl} alt={unit.name} onError={() => setImgOk(false)}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: t.text, lineHeight: 1.2 }}>{unit.name}</div>
          <div style={{ fontSize: 10, color: t.textDim, marginTop: 2 }}>
            {unit.subtype ? SUBTYPE_LABEL[unit.subtype] : "Terrestre"}
            {unit.divinite && <span style={{ marginLeft: 6, color: t.accent }}>· {unit.divinite}</span>}
          </div>
          {unit.note && <div style={{ fontSize: 9, color: t.textDim, marginTop: 3, lineHeight: 1.3, fontStyle: "italic" }}>{unit.note}</div>}
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

      {mode === "attaque" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <StatBar iconSrc={ICONS.atk} label="Attaque" value={unit.attack} max={maxAtk} color={t.red} />
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            <div style={{ flex: 1, background: t.red + "15", border: `1px solid ${t.red}33`, borderRadius: 7, padding: "5px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: t.red, fontFamily: "var(--font-dm-mono), monospace", lineHeight: 1 }}>{atkPop.toFixed(atkPop >= 10 ? 0 : 1)}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, marginTop: 3 }}>
                <img src={ICONS.atk} alt="" style={{ width: 12, height: 12, objectFit: "contain" }} />
                <span style={{ fontSize: 9, color: t.textDim }}>par</span>
                <img src={ICONS.pop} alt="" style={{ width: 12, height: 12, objectFit: "contain" }} />
              </div>
            </div>
            <div style={{ flex: 1, background: t.lavender, border: `1px solid ${t.lavenderMid}`, borderRadius: 7, padding: "5px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.lavenderDeep, fontFamily: "var(--font-dm-mono), monospace", lineHeight: 1 }}>{totalCost(unit).toLocaleString()}</div>
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
          <StatBar iconSrc={ICONS.defCoup} label="Contondant" value={unit.defContond} max={maxDef} color="#f59e0b" star={specialty === "Contondant"} />
          <StatBar iconSrc={ICONS.defLame} label="Tranchant"  value={unit.defBlanche} max={maxDef} color="#22c78a" star={specialty === "Tranchant"} />
          <StatBar iconSrc={ICONS.defJet}  label="Distance"   value={unit.defJet}     max={maxDef} color="#8b7ff5" star={specialty === "Jet"} />
          <div style={{ marginTop: 4, background: t.lavender, border: `1px solid ${t.lavenderMid}`, borderRadius: 7, padding: "5px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 9, color: t.textDim }}>★</span>
              <img src={specialty === "Contondant" ? ICONS.defCoup : specialty === "Tranchant" ? ICONS.defLame : ICONS.defJet} alt="" style={{ width: 14, height: 14, objectFit: "contain" }} />
              <span style={{ fontSize: 9, color: t.textDim }}>par</span>
              <img src={ICONS.pop} alt="" style={{ width: 14, height: 14, objectFit: "contain" }} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: t.lavenderDeep, fontFamily: "var(--font-dm-mono), monospace" }}>{defPop.toFixed(defPop >= 10 ? 0 : 1)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function TierSection({ tier, units, mode, maxAtk, maxDef, tiers }: {
  tier: Tier; units: Unit[]; mode: SimMode; maxAtk: number; maxDef: number; tiers: Map<string, Tier>;
}) {
  const { t } = useTheme();
  const filtered = units.filter((u) => tiers.get(u.id) === tier);
  if (!filtered.length) return null;
  const color = TIER_COLOR[tier];

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: color + "22", border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, color, flexShrink: 0 }}>
          {tier}
        </div>
        <div style={{ fontSize: 11, color: t.textDim }}>
          {tier === "S" ? "Excellent — meilleur choix contre cette composition"
           : tier === "A" ? "Très efficace"
           : tier === "B" ? "Correct — peut convenir"
           : "Peu adapté à cette composition"}
        </div>
        <div style={{ flex: 1, height: 1, background: color + "33" }} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {filtered.map((u) => <UnitCard key={u.id} unit={u} mode={mode} maxAtk={maxAtk} maxDef={maxDef} />)}
      </div>
    </div>
  );
}

function SimUnitRow({ unit, count, onChange }: { unit: Unit; count: number; onChange: (n: number) => void }) {
  const { t } = useTheme();
  const [imgOk, setImgOk] = useState(true);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
      <div style={{ width: 28, height: 28, borderRadius: 6, overflow: "hidden", background: t.lavender, flexShrink: 0, position: "relative" }}>
        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{unit.emoji}</span>
        {imgOk && unit.imageUrl && (
          <img src={unit.imageUrl} alt="" onError={() => setImgOk(false)}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
        )}
      </div>
      <span style={{ flex: 1, fontSize: 12, color: t.text }}>{unit.name}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button
          onClick={() => onChange(Math.max(0, count - (count >= 500 ? 100 : count >= 100 ? 50 : count >= 10 ? 10 : 1)))}
          style={{ width: 22, height: 22, borderRadius: 5, border: `1px solid ${t.border}`, background: "transparent", color: t.textMid, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
        >−</button>
        <input
          type="number" min={0} value={count || ""}
          onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          style={{ width: 60, padding: "3px 6px", borderRadius: 5, border: `1px solid ${t.border}`, background: t.bg, color: t.text, fontSize: 12, textAlign: "center", fontFamily: "var(--font-dm-mono), monospace" }}
          placeholder="0"
        />
        <button
          onClick={() => onChange(count + (count >= 500 ? 100 : count >= 100 ? 50 : count >= 10 ? 10 : 1))}
          style={{ width: 22, height: 22, borderRadius: 5, border: `1px solid ${t.border}`, background: "transparent", color: t.textMid, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
        >+</button>
      </div>
    </div>
  );
}

function CompositionSummary({ counts, mode }: { counts: Record<string, number>; mode: SimMode }) {
  const { t } = useTheme();
  const entries = Object.entries(counts).filter(([, v]) => v > 0);
  if (!entries.length) return null;

  let totalAtk = 0, totalC = 0, totalB = 0, totalJ = 0;
  let totalDefC = 0, totalDefB = 0, totalDefJ = 0, totalPop = 0;

  for (const [id, cnt] of entries) {
    const u = UNITS.find((x) => x.id === id);
    if (!u) continue;
    if (mode === "defense") {
      const a = u.attack * cnt;
      if      (u.attackType === "contondant") totalC += a;
      else if (u.attackType === "blanche")    totalB += a;
      else if (u.attackType === "jet")        totalJ += a;
      else { totalC += a/3; totalB += a/3; totalJ += a/3; }
      totalAtk += a;
    } else {
      totalDefC += u.defContond * cnt;
      totalDefB += u.defBlanche * cnt;
      totalDefJ += u.defJet * cnt;
      totalPop  += u.pop * cnt;
    }
  }

  const chips: { label: string; color: string; value: string }[] = [];
  if (mode === "defense" && totalAtk > 0) {
    if (totalC > 0) chips.push({ label: "Contondant", color: "#f59e0b", value: `${Math.round(totalC).toLocaleString()} atk` });
    if (totalB > 0) chips.push({ label: "Tranchant",  color: "#22c78a", value: `${Math.round(totalB).toLocaleString()} atk` });
    if (totalJ > 0) chips.push({ label: "Distance",   color: "#8b7ff5", value: `${Math.round(totalJ).toLocaleString()} atk` });
  } else if (mode === "attaque" && totalPop > 0) {
    chips.push({ label: "Déf. Cont.", color: "#f59e0b", value: `${Math.round(totalDefC / totalPop)}/pop` });
    chips.push({ label: "Déf. Tran.", color: "#22c78a", value: `${Math.round(totalDefB / totalPop)}/pop` });
    chips.push({ label: "Déf. Dist.", color: "#8b7ff5", value: `${Math.round(totalDefJ / totalPop)}/pop` });
  }

  return (
    <div style={{ background: t.bg, borderRadius: 8, padding: "8px 10px", marginTop: 10 }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2, color: t.textDim, textTransform: "uppercase", marginBottom: 6 }}>
        {mode === "defense" ? "Attaque ennemie" : "Défense ennemie"}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {chips.map((c) => (
          <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 5, background: c.color + "18", border: `1px solid ${c.color}44`, borderRadius: 6, padding: "3px 8px" }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: c.color }}>{c.label}</span>
            <span style={{ fontSize: 10, fontFamily: "var(--font-dm-mono), monospace", color: t.text }}>{c.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function SimulationClient() {
  const { t } = useTheme();
  const [mode, setMode] = useState<SimMode>("attaque");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [analyzed, setAnalyzed] = useState(false);

  const hasInput = Object.values(counts).some((v) => v > 0);

  const setCount = (id: string, n: number) => {
    setCounts((prev) => ({ ...prev, [id]: n }));
    setAnalyzed(false);
  };

  const handleReset = () => {
    setCounts({});
    setAnalyzed(false);
  };

  const scored = useMemo<{ unit: Unit; score: number }[]>(() => {
    if (!analyzed || !hasInput) return [];
    return SIM_UNITS.map((u) => ({
      unit: u,
      score: mode === "attaque" ? simAttackScore(u, counts) : simDefenseScore(u, counts),
    }));
  }, [analyzed, hasInput, mode, counts]);

  const tiers = useMemo(() => {
    if (!scored.length) return new Map<string, Tier>();
    return assignTiers(
      scored.map((x) => x.unit),
      (u) => scored.find((x) => x.unit.id === u.id)?.score ?? 0,
    );
  }, [scored]);

  const maxAtk = useMemo(() => Math.max(...SIM_UNITS.map((u) => u.attack), 1), []);
  const maxDef = useMemo(() => Math.max(...SIM_UNITS.flatMap((u) => [u.defContond, u.defBlanche, u.defJet]), 1), []);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 24px 12px", borderBottom: `1px solid ${t.border}`, background: t.bgCard, flexShrink: 0 }}>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: t.text, letterSpacing: -0.3 }}>⚡ Simulation de combat</h1>
        <div style={{ color: t.textLight, fontSize: 11, marginTop: 1 }}>
          Entrez la composition ennemie et obtenez les meilleures unités à utiliser en réponse (FR180)
        </div>
      </div>

      {/* Mode toggle + content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left: Inputs */}
        <div style={{ width: 340, flexShrink: 0, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Mode buttons */}
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}`, display: "flex", gap: 6, flexShrink: 0 }}>
            {(["attaque", "defense"] as SimMode[]).map((m) => (
              <button key={m} onClick={() => { setMode(m); setAnalyzed(false); }} style={{
                flex: 1, padding: "8px 0", borderRadius: 8,
                border: `1px solid ${mode === m ? t.accent : t.border}`,
                background: mode === m ? t.accent + "18" : "transparent",
                color: mode === m ? t.accent : t.textMid,
                fontWeight: 600, fontSize: 13, cursor: "pointer",
              }}>
                {m === "attaque" ? "⚔ J'attaque" : "🛡 Je défends"}
              </button>
            ))}
          </div>

          {/* Unit table — scrollable */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
            <div style={{ fontSize: 11, color: t.textDim, marginBottom: 12, lineHeight: 1.5 }}>
              {mode === "attaque"
                ? "Quelle est la défense ennemie ? On vous dit quoi envoyer pour l'éliminer."
                : "Combien d'unités vous attaquent ? On vous dit comment défendre."}
            </div>

            {SIM_GROUPS.map((group) => (
              <div key={group.label} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.3, color: t.textDim, textTransform: "uppercase", marginBottom: 8, paddingBottom: 4, borderBottom: `1px solid ${t.border}` }}>
                  {group.label}
                </div>
                {group.units.map((u) => (
                  <SimUnitRow key={u.id} unit={u} count={counts[u.id] ?? 0} onChange={(n) => setCount(u.id, n)} />
                ))}
              </div>
            ))}

            {hasInput && <CompositionSummary counts={counts} mode={mode} />}
          </div>

          {/* Actions */}
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${t.border}`, display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => setAnalyzed(true)}
              disabled={!hasInput}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 8,
                background: hasInput ? t.accent : t.border,
                color: hasInput ? "#fff" : t.textDim,
                border: "none", fontWeight: 700, fontSize: 14, cursor: hasInput ? "pointer" : "not-allowed",
              }}
            >
              Analyser
            </button>
            <button
              onClick={handleReset}
              style={{ padding: "10px 16px", borderRadius: 8, border: `1px solid ${t.border}`, background: "transparent", color: t.textMid, fontSize: 12, cursor: "pointer" }}
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {/* Right: Results */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          {!analyzed || !hasInput ? (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <div style={{ fontSize: 48, opacity: 0.15 }}>⚡</div>
              <div style={{ fontSize: 14, color: t.textDim, textAlign: "center", maxWidth: 320, lineHeight: 1.6 }}>
                Entrez la composition ennemie à gauche puis cliquez sur <strong style={{ color: t.text }}>Analyser</strong> pour obtenir les meilleures unités à utiliser.
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>
                  {mode === "attaque"
                    ? "Meilleures unités pour attaquer cette défense"
                    : "Meilleures unités pour défendre contre cette attaque"}
                </div>
                <div style={{ fontSize: 11, color: t.textDim, marginTop: 3 }}>
                  Classées par efficacité par population contre la composition saisie
                </div>
              </div>
              {TIER_ORDER.map((tier) => (
                <TierSection
                  key={tier} tier={tier}
                  units={scored.map((x) => x.unit)}
                  mode={mode} maxAtk={maxAtk} maxDef={maxDef} tiers={tiers}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
