"use client";
import { useTheme } from "@/components/theme-provider";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t } = useTheme();
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: t.bg }}>
      <Sidebar />
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}
