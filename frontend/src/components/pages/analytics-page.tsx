"use client";

import { analyticsApi, finalAnalyticsApi } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import type { AnalyticsSummaryResponse, FinalAnalyticsResponse } from "@/lib/types";
import { useApiQuery } from "@/hooks/use-api-query";
import { KeyValueList } from "@/components/page-elements";
import {
  Button,
  Card,
  ErrorState,
  LoadingState,
  SectionHeader,
  SimpleBarChart,
  StatCard,
} from "@/components/ui";

interface AnalyticsPageData {
  analytics: AnalyticsSummaryResponse;
  finalAnalytics: FinalAnalyticsResponse;
}

async function loadAnalyticsData(): Promise<AnalyticsPageData> {
  const [analytics, finalAnalytics] = await Promise.all([
    analyticsApi.summary(),
    finalAnalyticsApi.summary(),
  ]);

  return { analytics, finalAnalytics };
}

export function AnalyticsPage() {
  const { data, error, loading, reload } = useApiQuery(loadAnalyticsData);

  if (loading && !data) {
    return (
      <LoadingState
        title="Loading analytics"
        description="Reading summary and final analytics endpoints."
      />
    );
  }

  if (error && !data) {
    return (
      <ErrorState
        description={error}
        action={
          <Button variant="secondary" onClick={() => void reload()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (!data) {
    return <ErrorState description="Analytics data is unavailable." />;
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Operational Metrics"
        title="Analytics"
        description="Final analytics summary, execution cards, and chart structures ready for trend expansion."
        actions={
          <Button variant="secondary" onClick={() => void reload()}>
            Refresh
          </Button>
        }
      />

      {error ? <ErrorState title="Partial data issue" description={error} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Completion Rate"
          value={`${data.analytics.completion_rate.toFixed(1)}%`}
          hint="Task completion"
          tone="success"
        />
        <StatCard
          label="Overdue Tasks"
          value={formatNumber(data.analytics.overdue_count)}
          hint="Open tasks past due"
          tone="danger"
        />
        <StatCard
          label="Plan Adherence"
          value={`${data.analytics.plan_adherence_rate.toFixed(1)}%`}
          hint="Completed plan share"
        />
        <StatCard
          label="Generated Plans"
          value={formatNumber(data.analytics.generated_plan_count)}
          hint="Orchestrator briefs generated"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <SimpleBarChart
          title="Execution Metrics"
          description="Current execution KPIs from analytics summary."
          data={[
            {
              label: "Completion rate",
              value: data.analytics.completion_rate,
              suffix: "%",
            },
            {
              label: "Plan adherence",
              value: data.analytics.plan_adherence_rate,
              suffix: "%",
            },
            { label: "Overdue count", value: data.analytics.overdue_count },
            { label: "Tasks completed", value: data.analytics.completed_tasks },
          ]}
        />

        <SimpleBarChart
          title="Agent Output"
          description="Cross-domain counts from the final analytics summary."
          data={[
            {
              label: "Plan items complete",
              value: data.finalAnalytics.completed_plan_items,
            },
            {
              label: "Study sessions",
              value: data.finalAnalytics.study_sessions_completed,
            },
            {
              label: "Active applications",
              value: data.finalAnalytics.job_active_applications,
            },
            {
              label: "Workouts complete",
              value: data.finalAnalytics.health_weekly_workouts_completed,
            },
          ]}
        />
      </div>

      <Card className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-white">Trend-ready metric structure</h3>
          <p className="text-sm text-slate-400">
            The backend currently returns snapshots, so this layout keeps cards and charts ready
            for time-series data without inventing fake trends.
          </p>
        </div>
        <KeyValueList
          items={[
            { label: "Total tasks", value: formatNumber(data.finalAnalytics.total_tasks) },
            {
              label: "Completed tasks",
              value: formatNumber(data.finalAnalytics.completed_tasks),
            },
            {
              label: "Generated plans",
              value: formatNumber(data.finalAnalytics.generated_plans),
            },
            {
              label: "Total plan items",
              value: formatNumber(data.finalAnalytics.total_plan_items),
            },
            {
              label: "Urgent life admin items",
              value: formatNumber(data.finalAnalytics.life_admin_urgent_items),
            },
            { label: "Prompt runs", value: formatNumber(data.finalAnalytics.prompt_runs) },
          ]}
        />
      </Card>
    </div>
  );
}
