import { AppShell } from "@/components/layout/app-shell";
import { ConquestClient } from "@/components/conquest/conquest-client";

export default function ConquestPage() {
  return (
    <AppShell>
      <ConquestClient />
    </AppShell>
  );
}
