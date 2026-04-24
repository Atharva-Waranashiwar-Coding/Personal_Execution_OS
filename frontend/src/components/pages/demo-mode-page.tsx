"use client";

import { useState } from "react";

import { demoApi, healthRoutineApi, jobApi, lifeAdminApi, studyApi, tasksApi } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { settledValue } from "@/lib/request";
import type { DemoSeedResponse, Task } from "@/lib/types";
import { useApiQuery } from "@/hooks/use-api-query";
import {
  Button,
  Card,
  ErrorState,
  JsonPreview,
  LoadingState,
  SectionHeader,
  StatCard,
} from "@/components/ui";

interface DemoPageData {
  response: DemoSeedResponse | null;
  tasks: Task[];
  topics: Awaited<ReturnType<typeof studyApi.listTopics>>;
  applications: Awaited<ReturnType<typeof jobApi.listApplications>>;
  items: Awaited<ReturnType<typeof lifeAdminApi.listItems>>;
  preferences: Awaited<ReturnType<typeof healthRoutineApi.listPreferences>>;
}

async function loadDemoData(): Promise<Omit<DemoPageData, "response">> {
  const results = await Promise.allSettled([
    tasksApi.list(),
    studyApi.listTopics(),
    jobApi.listApplications(),
    lifeAdminApi.listItems(),
    healthRoutineApi.listPreferences(),
  ]);

  return {
    tasks: settledValue(results[0], []),
    topics: settledValue(results[1], []),
    applications: settledValue(results[2], []),
    items: settledValue(results[3], []),
    preferences: settledValue(results[4], []),
  };
}

export function DemoModePage() {
  const { data, error, loading, reload } = useApiQuery(loadDemoData);
  const [seedResponse, setSeedResponse] = useState<DemoSeedResponse | null>(null);
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);

    try {
      const response = await demoApi.seed();
      setSeedResponse(response);
      await reload();
    } finally {
      setSeeding(false);
    }
  };

  if (loading && !data) {
    return (
      <LoadingState
        title="Loading demo mode"
        description="Inspecting seeded sample data surfaces."
      />
    );
  }

  const demo = data ?? {
    tasks: [],
    topics: [],
    applications: [],
    items: [],
    preferences: [],
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Demo Workflow"
        title="Demo Mode"
        description="Seed backend demo data, explain the workflow, and inspect generated sample records afterward."
        actions={
          <Button onClick={() => void handleSeed()} disabled={seeding}>
            {seeding ? "Seeding..." : "Seed Demo Data"}
          </Button>
        }
      />

      {error ? <ErrorState description={error} /> : null}

      <Card className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-white">Demo workflow</h3>
          <p className="text-sm leading-6 text-slate-400">
            The backend seed route creates representative task, study, job, life admin, and
            health data for the current user. If demo mode is disabled server-side, the response
            will explain that instead of seeding records.
          </p>
        </div>
        {seedResponse ? <JsonPreview title="Latest seed response" value={seedResponse} /> : null}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Sample Tasks"
          value={formatNumber(demo.tasks.length)}
          hint="Tasks available after seeding"
        />
        <StatCard
          label="Study Topics"
          value={formatNumber(demo.topics.length)}
          hint="Study data seeded"
        />
        <StatCard
          label="Applications"
          value={formatNumber(demo.applications.length)}
          hint="Job pipeline records"
        />
        <StatCard
          label="Life Admin"
          value={formatNumber(demo.items.length)}
          hint="Administrative items"
        />
        <StatCard
          label="Preferences"
          value={formatNumber(demo.preferences.length)}
          hint="Health preferences"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <JsonPreview title="Sample task records" value={demo.tasks.slice(0, 3)} />
        <JsonPreview title="Sample study topics" value={demo.topics.slice(0, 3)} />
        <JsonPreview
          title="Sample job applications"
          value={demo.applications.slice(0, 3)}
        />
        <JsonPreview title="Sample life admin items" value={demo.items.slice(0, 3)} />
        <JsonPreview
          title="Sample workout preferences"
          value={demo.preferences.slice(0, 3)}
        />
      </div>
    </div>
  );
}
