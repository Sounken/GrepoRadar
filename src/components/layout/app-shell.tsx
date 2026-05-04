"use client";
import { useTheme } from "@/components/theme-provider";
import { Sidebar } from "./sidebar";
import { useIsMobile } from "@/hooks/use-is-mobile";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useTheme();
  const isMobile = useIsMobile();
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: t.bg }}>
      {!isMobile && <Sidebar />}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", paddingBottom: isMobile ? 58 : 0 }}>
        {children}
      </div>
      {isMobile && <Sidebar />}
    </div>
  );
}
