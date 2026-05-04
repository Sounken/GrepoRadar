"use client";
import { useTheme } from "@/components/theme-provider";

export function Sparkline({
  data,
  color,
  width = 100,
  height = 32,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const { t } = useTheme();
  const c = color ?? t.accent;

  if (!data || data.length < 2) return null;

  const mn = Math.min(...data);
  const mx = Math.max(...data);
  const range = mx - mn || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    height - ((v - mn) / range) * height,
  ]);
  const d = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(" ");
  const fill =
    pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
      .join(" ") + ` L${width},${height} L0,${height} Z`;

  const gradId = `sg${c.replace("#", "")}`;

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.25" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${gradId})`} />
      <path
        d={d}
        fill="none"
        stroke={c}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
