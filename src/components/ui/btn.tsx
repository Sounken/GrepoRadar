"use client";
import { useState } from "react";
import { useTheme } from "@/components/theme-provider";

interface BtnProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "secondary";
  small?: boolean;
  disabled?: boolean;
  full?: boolean;
  style?: React.CSSProperties;
  type?: "button" | "submit";
}

export function Btn({
  children,
  onClick,
  variant = "primary",
  small,
  disabled,
  full,
  style: ex,
  type = "button",
}: BtnProps) {
  const { t } = useTheme();
  const [hov, setHov] = useState(false);

  const bg =
    variant === "primary"
      ? hov
        ? t.accentLight
        : t.accent
      : variant === "ghost"
      ? hov
        ? t.lavender
        : "transparent"
      : hov
      ? t.bgSidebarHover
      : t.bgCard;

  const color =
    variant === "primary" ? "#fff" : variant === "ghost" ? t.accent : t.textMid;

  const border =
    variant === "primary"
      ? "none"
      : variant === "ghost"
      ? `1px solid ${t.lavenderMid}`
      : `1px solid ${t.border}`;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: bg,
        color,
        border,
        borderRadius: 8,
        padding: small ? "5px 12px" : "8px 18px",
        fontSize: small ? 11 : 13,
        fontWeight: 500,
        fontFamily: "var(--font-dm-sans), sans-serif",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.12s",
        width: full ? "100%" : "auto",
        ...ex,
      }}
    >
      {children}
    </button>
  );
}
