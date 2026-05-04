"use client";
import { useState } from "react";
import { useTheme } from "@/components/theme-provider";

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
  pad?: string;
}

export function Card({ children, style, onClick, pad = "18px 20px" }: CardProps) {
  const { t } = useTheme();
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => onClick && setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      style={{
        background: hov ? t.bgSidebarHover : t.bgCard,
        border: `1px solid ${t.border}`,
        borderRadius: 14,
        padding: pad,
        transition: "box-shadow 0.18s,background 0.18s",
        boxShadow:
          hov && onClick
            ? "0 6px 24px rgba(0,0,0,0.07)"
            : "0 1px 3px rgba(0,0,0,0.04)",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
