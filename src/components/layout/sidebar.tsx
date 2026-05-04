"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { THEMES, type ThemeKey } from "@/lib/themes";
import { useIsMobile } from "@/hooks/use-is-mobile";

const NAV = [
  {
    id: "dashboard",
    href: "/",
    label: "Dashboard",
    icon: (size = 14) => (
      <svg width={size} height={size} viewBox="0 0 15 15" fill="none">
        <rect x="1" y="1" width="5.5" height="5.5" rx="1.2" fill="currentColor" />
        <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.2" fill="currentColor" />
        <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.2" fill="currentColor" />
        <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.2" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "conquest",
    href: "/conquest",
    label: "Conquête",
    icon: (size = 14) => (
      <svg width={size} height={size} viewBox="0 0 15 15" fill="none">
        <path
          d="M7.5 1.5L9.2 5.8H13.8L10.1 8.4L11.5 12.8L7.5 10.3L3.5 12.8L4.9 8.4L1.2 5.8H5.8L7.5 1.5Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
];

export function Sidebar() {
  const { t, themeKey, setTheme } = useTheme();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const themeKeys = Object.keys(THEMES) as ThemeKey[];
  const cycleTheme = () => {
    const idx = themeKeys.indexOf(themeKey);
    setTheme(themeKeys[(idx + 1) % themeKeys.length]);
  };

  // ── Mobile: barre de navigation basse ──────────────────────────────────────
  if (isMobile) {
    return (
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 58,
          background: t.bgSidebar,
          borderTop: `1px solid ${t.bgSidebarBorder}`,
          display: "flex",
          alignItems: "stretch",
          zIndex: 100,
        }}
      >
        {NAV.map((n) => {
          const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
          return (
            <Link
              key={n.id}
              href={n.href}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                color: active ? t.accent : t.textOnDarkDim,
                textDecoration: "none",
                borderTop: `2px solid ${active ? t.accent : "transparent"}`,
                paddingTop: 2,
              }}
            >
              <span style={{ color: active ? t.accent : t.textOnDarkDim, display: "flex" }}>
                {n.icon(18)}
              </span>
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{n.label}</span>
            </Link>
          );
        })}
        <button
          onClick={cycleTheme}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            background: "none",
            border: "none",
            borderTop: "2px solid transparent",
            color: t.textOnDarkDim,
            cursor: "pointer",
            paddingTop: 2,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10 4.5C10 4.5 14.5 8 14.5 10.5C14.5 13 12.5 15 10 15C7.5 15 5.5 13 5.5 10.5C5.5 8 10 4.5 10 4.5Z" fill="currentColor" opacity="0.5" />
          </svg>
          <span style={{ fontSize: 10 }}>{THEMES[themeKey].name}</span>
        </button>
      </nav>
    );
  }

  // ── Desktop: sidebar latérale ───────────────────────────────────────────────
  return (
    <div
      style={{
        width: 200,
        background: t.bgSidebar,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        height: "100%",
        borderRight: `1px solid ${t.bgSidebarBorder}`,
      }}
    >
      {/* Logo */}
      <div style={{ padding: "20px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: t.sidebarLogoBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="white" strokeWidth="1.5" />
              <circle cx="7" cy="7" r="2" fill="white" />
              <line x1="7" y1="1.5" x2="7" y2="3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="7" y1="11" x2="7" y2="12.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="1.5" y1="7" x2="3" y2="7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="11" y1="7" x2="12.5" y2="7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div style={{ color: t.textOnDark, fontSize: 13, fontWeight: 700, letterSpacing: -0.3 }}>
              GrepoRadar
            </div>
            <div style={{ color: t.textOnDarkDim, fontSize: 10 }}>FR180</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ padding: "4px 10px", flex: 1 }}>
        <div
          style={{
            color: t.textOnDarkDim,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: 1.5,
            padding: "0 8px",
            marginBottom: 6,
            textTransform: "uppercase",
          }}
        >
          Navigation
        </div>
        {NAV.map((n) => {
          const active = n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
          return (
            <Link
              key={n.id}
              href={n.href}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                borderRadius: 8,
                background: active ? t.bgSidebarActive : "transparent",
                color: active ? t.accent : t.textOnDarkDim,
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                marginBottom: 2,
                textDecoration: "none",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = t.bgSidebarHover;
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              <span style={{ color: active ? t.accent : t.textOnDarkDim, display: "flex", flexShrink: 0 }}>
                {n.icon(14)}
              </span>
              {n.label}
              {active && (
                <div
                  style={{
                    marginLeft: "auto",
                    width: 3,
                    height: 16,
                    borderRadius: 2,
                    background: t.sidebarAccentDot,
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* Theme switcher */}
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${t.bgSidebarBorder}` }}>
        <div
          style={{
            color: t.textOnDarkDim,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: 1.5,
            marginBottom: 6,
            textTransform: "uppercase",
          }}
        >
          Thème
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {themeKeys.map((key) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              style={{
                flex: 1,
                padding: "5px 0",
                borderRadius: 7,
                border: `1.5px solid ${themeKey === key ? t.accent : t.bgSidebarBorder}`,
                background: themeKey === key ? t.bgSidebarActive : "transparent",
                color: themeKey === key ? t.accent : t.textOnDarkDim,
                fontSize: 10,
                fontWeight: themeKey === key ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {THEMES[key].name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
