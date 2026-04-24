"use client";

import {
  HealthPanel,
  JobPanel,
  LifeAdminPanel,
  OrchestratorPanel,
  StudyPanel,
} from "@/components/dashboard-panels";
import { SectionHeader } from "@/components/ui";

export function OverviewPage() {
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="Command Center"
        title="Daily Execution Plan"
        description={`${today}  ·  Review your orchestrated brief, act on top priorities, and keep all agents in sync.`}
      />

      {/* Orchestrator — full width, primary focus */}
      <OrchestratorPanel />

      {/* Four agent panels — 2 × 2 grid, independent data fetches */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StudyPanel />
        <JobPanel />
        <HealthPanel />
        <LifeAdminPanel />
      </div>
    </div>
  );
}
