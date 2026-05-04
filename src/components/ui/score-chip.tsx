"use client";
import { useTheme } from "@/components/theme-provider";

function useScoreColor(score: number) {
  const { t } = useTheme();
  return score >= 80 ? t.scoreA : score >= 60 ? t.scoreB : score >= 40 ? t.scoreC : t.scoreD;
}

export function ScoreChip({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  const col = useScoreColor(score);
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Bon" : score >= 40 ? "Moyen" : "Risqué";

  if (size === "lg") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            border: `3px solid ${col}`,
            background: col + "18",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ color: col, fontWeight: 700, fontSize: 20 }}>{score}</span>
        </div>
        <span style={{ color: col, fontSize: 10, fontWeight: 600 }}>{label}</span>
      </div>
    );
  }

  return (
    <span
      style={{
        background: col + "18",
        color: col,
        fontWeight: 700,
        fontSize: 12,
        padding: "3px 9px",
        borderRadius: 8,
        fontFamily: "var(--font-dm-mono), monospace",
      }}
    >
      {score}
    </span>
  );
}

export function MiniBar({ val, max = 100, color }: { val: number; max?: number; color?: string }) {
  const col = useScoreColor(val);
  const { t } = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: 40,
          height: 4,
          background: t.border,
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min((val / max) * 100, 100)}%`,
            height: "100%",
            background: color ?? col,
            borderRadius: 4,
          }}
        />
      </div>
      <span
        style={{
          color: color ?? col,
          fontSize: 11,
          fontWeight: 600,
          fontFamily: "var(--font-dm-mono), monospace",
          minWidth: 18,
        }}
      >
        {val}
      </span>
    </div>
  );
}
