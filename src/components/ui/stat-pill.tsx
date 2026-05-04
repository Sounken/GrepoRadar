"use client";
import { useTheme } from "@/components/theme-provider";

export function StatPill({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: string | number;
  color?: string;
  bg?: string;
}) {
  const { t } = useTheme();
  return (
    <div
      style={{
        background: bg ?? t.bg,
        borderRadius: 8,
        padding: "10px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <span
        style={{
          color: t.textLight,
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span style={{ color: color ?? t.text, fontWeight: 700, fontSize: 16 }}>{value}</span>
    </div>
  );
}
