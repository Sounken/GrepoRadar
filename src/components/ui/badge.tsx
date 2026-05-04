"use client";
import { useTheme } from "@/components/theme-provider";

export function Badge({
  children,
  color,
  bg,
}: {
  children: React.ReactNode;
  color?: string;
  bg?: string;
}) {
  const { t } = useTheme();
  return (
    <span
      style={{
        background: bg ?? t.lavender,
        color: color ?? t.lavenderDeep,
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 6,
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  const { t } = useTheme();
  const map: Record<string, { label: string; bg: string; color: string }> = {
    ghost:    { label: "Fantôme", bg: t.lavender,    color: t.lavenderDeep },
    inactive: { label: "Inactif", bg: t.redLight,    color: t.red },
    suspect:  { label: "Suspect", bg: t.amberLight,  color: t.amber },
    active:   { label: "Actif",   bg: t.greenLight,  color: t.green },
  };
  const i = map[type] ?? map.active;
  return (
    <span
      style={{
        background: i.bg,
        color: i.color,
        fontSize: 10,
        fontWeight: 600,
        padding: "2px 9px",
        borderRadius: 6,
      }}
    >
      {i.label}
    </span>
  );
}
