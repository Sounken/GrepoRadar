import { AppShell } from "@/components/layout/app-shell";
import { TroupesClient } from "@/components/troupes/troupes-client";

export default function TroupesPage() {
  return (
    <AppShell>
      <TroupesClient />
    </AppShell>
  );
}
