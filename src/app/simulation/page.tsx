import { AppShell } from "@/components/layout/app-shell";
import { SimulationClient } from "@/components/simulation/simulation-client";

export default function SimulationPage() {
  return (
    <AppShell>
      <SimulationClient />
    </AppShell>
  );
}
