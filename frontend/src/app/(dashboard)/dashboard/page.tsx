"use client";

import { useState } from "react";

import { AICommandPanel } from "@/components/ai/AICommandPanel";
import { OverviewPage } from "@/components/pages/overview-page";

export default function DashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-5">
      <AICommandPanel onCommandComplete={() => setRefreshKey((k) => k + 1)} />
      <OverviewPage key={refreshKey} />
    </div>
  );
}
