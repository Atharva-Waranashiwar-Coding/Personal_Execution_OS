"use client";

import { useState } from "react";

import {
  analyticsApi,
  approvalsApi,
  finalAnalyticsApi,
  healthRoutineApi,
  jobApi,
  notificationsApi,
  orchestratorApi,
  studyApi,
  viewsApi,
} from "@/lib/api";
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatPercent,
  toneFromPriority,
  toneFromStatus,
} from "@/lib/format";
import { settledValue } from "@/lib/request";
import type {
  AnalyticsSummaryResponse,
  Approval,
  FinalAnalyticsResponse,
  HealthInsightResponse,
  JobInsightResponse,
  NotificationHistory,
  PlanBrief,
  StudyInsightResponse,
  TodayViewResponse,
  WeeklyViewResponse,
} from "@/lib/types";
import { useApiQuery } from "@/hooks/use-api-query";
import { Badge, Button, Card, ErrorState, LoadingState, SectionHeader, StatCard } from "@/components/ui";

interface OverviewData {
  today: TodayViewResponse;
  weekly: WeeklyViewResponse;
  approvals: Approval[];
  analytics: AnalyticsSummaryResponse | null;
  finalAnalytics: FinalAnalyticsResponse | null;
  briefs: PlanBrief[];
  studyInsights: StudyInsightResponse | null;
  jobInsights: JobInsightResponse | null;
  healthInsights: HealthInsightResponse | null;
  notifications: NotificationHistory[];
}

async function loadOverview(): Promise<OverviewData> {
  const results = await Promise.allSettled([
    viewsApi.today(),
    viewsApi.weekly(),
    approvalsApi.listPending(),
    analyticsApi.summary(),
    finalAnalyticsApi.summary(),
    orchestratorApi.listBriefs(),
    studyApi.insights(),
    jobApi.insights(),
    healthRoutineApi.insights(),
    notificationsApi.listHistory(),
  ]);

  return {
    today: settledValue(results[0], { tasks: [], plans: [] }),
    weekly: settledValue(results[1], { tasks: [], plans: [] }),
    approvals: settledValue(results[2], []),
    analytics: settledValue(results[3], null),
    finalAnalytics: settledValue(results[4], null),
    briefs: settledValue(results[5], []),
    studyInsights: settledValue(results[6], null),
    jobInsights: settledValue(results[7], null),
    healthInsights: settledValue(results[8], null),
    notifications: settledValue(results[9], []),
  };
}

export function OverviewPage() {
  const { data, error, loading, reload } = useApiQuery(loadOverview);
  const [generating, setGenerating] = useState(false);

  const handleGeneratePlan = async () => {
    setGenerating(true);

    try {
      await orchestratorApi.generate();
      await reload();
    } finally {
      setGenerating(false);
    }
  };

  if (loading && !data) {
    return <LoadingState title="Loading overview" description="Collecting signals across all domains." />;
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

  const overview = data ?? {
    today: { tasks: [], plans: [] },
    weekly: { tasks: [], plans: [] },
    approvals: [],
    analytics: null,
    finalAnalytics: null,
    briefs: [],
    studyInsights: null,
    jobInsights: null,
    healthInsights: null,
    notifications: [],
  };

  const latestBrief = overview.briefs[0];

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Executive Summary"
        title="Execution Overview"
        description="A single operating view across today, this week, orchestration, and agent health."
        actions={
          <>
            <Button variant="secondary" onClick={() => void reload()}>
              Refresh
            </Button>
            <Button onClick={() => void handleGeneratePlan()} disabled={generating}>
              {generating ? "Generating..." : "Generate Plan"}
            </Button>
          </>
        }
      />

      {error ? <ErrorState title="Partial data issue" description={error} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Task Completion"
          value={formatPercent(overview.analytics?.completion_rate)}
          hint={`${formatNumber(overview.analytics?.completed_tasks)} of ${formatNumber(overview.analytics?.total_tasks)} tasks complete`}
          tone="success"
        />
        <StatCard
          label="Plan Adherence"
          value={formatPercent(overview.analytics?.plan_adherence_rate)}
          hint={`${formatNumber(overview.analytics?.generated_plan_count)} orchestrated briefs generated`}
          tone="warning"
        />
        <StatCard
          label="Pending Approvals"
          value={formatNumber(overview.approvals.length)}
          hint="Actions waiting for explicit approval"
          tone={overview.approvals.length ? "danger" : "neutral"}
        />
        <StatCard
          label="Estimated LLM Cost"
          value={formatCurrency(overview.finalAnalytics?.total_estimated_llm_cost)}
          hint={`${formatNumber(overview.finalAnalytics?.prompt_runs)} prompt runs logged`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-medium text-white">Today and Week Snapshot</h3>
              <p className="text-sm text-slate-400">
                Current task load and scheduled plans from the backend view routes.
              </p>
            </div>
            <Badge tone="success">Live</Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[26px] border border-white/8 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Today
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-3xl font-semibold text-white">
                    {formatNumber(overview.today.tasks.length)}
                  </p>
                  <p className="text-sm text-slate-400">Tasks in focus</p>
                </div>
                <div>
                  <p className="text-3xl font-semibold text-white">
                    {formatNumber(overview.today.plans.length)}
                  </p>
                  <p className="text-sm text-slate-400">Plans scheduled</p>
                </div>
              </div>
            </div>
            <div className="rounded-[26px] border border-white/8 bg-white/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Weekly Horizon
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-3xl font-semibold text-white">
                    {formatNumber(overview.weekly.tasks.length)}
                  </p>
                  <p className="text-sm text-slate-400">Tasks on deck</p>
                </div>
                <div>
                  <p className="text-3xl font-semibold text-white">
                    {formatNumber(overview.weekly.plans.length)}
                  </p>
                  <p className="text-sm text-slate-400">Plans ahead</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {overview.today.tasks.slice(0, 4).map((task) => (
              <div key={task.id} className="rounded-[24px] border border-white/8 bg-slate-900/60 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={toneFromPriority(task.priority)}>{task.priority}</Badge>
                  <Badge tone={toneFromStatus(task.status)}>{task.status}</Badge>
                </div>
                <p className="mt-3 text-sm font-medium text-white">{task.title}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Due {formatDateTime(task.due_at)} · Scheduled {formatDateTime(task.scheduled_for)}
                </p>
              </div>
            ))}
            {!overview.today.tasks.length ? (
              <div className="rounded-[24px] border border-dashed border-white/12 bg-white/4 p-4 text-sm text-slate-400 sm:col-span-2">
                No tasks are scheduled for today yet.
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">Final Analytics Summary</h3>
            <p className="text-sm text-slate-400">
              Roll-up metrics spanning tasks, plans, agents, and prompts.
            </p>
          </div>
          <div className="space-y-3">
            {[
              ["Completed tasks", formatNumber(overview.finalAnalytics?.completed_tasks)],
              ["Overdue tasks", formatNumber(overview.finalAnalytics?.overdue_tasks)],
              ["Plan items complete", formatNumber(overview.finalAnalytics?.completed_plan_items)],
              ["Study sessions", formatNumber(overview.finalAnalytics?.study_sessions_completed)],
              ["Active job apps", formatNumber(overview.finalAnalytics?.job_active_applications)],
              ["Weekly workouts", formatNumber(overview.finalAnalytics?.health_weekly_workouts_completed)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-4 py-3"
              >
                <span className="text-sm text-slate-400">{label}</span>
                <span className="text-sm font-medium text-white">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-medium text-white">Latest Orchestrator Brief</h3>
              <p className="text-sm text-slate-400">
                Ranked execution items with agent source, reasoning, and score.
              </p>
            </div>
            <Badge tone={latestBrief ? "success" : "neutral"}>
              {latestBrief ? `${latestBrief.items.length} items` : "No brief"}
            </Badge>
          </div>

          {latestBrief ? (
            <>
              <div className="rounded-[26px] border border-white/8 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Summary
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-200">{latestBrief.summary}</p>
              </div>
              <div className="space-y-3">
                {latestBrief.items.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[24px] border border-white/8 bg-slate-900/65 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">
                          #{item.rank_position ?? "?"} {item.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.source_agent} · {item.item_type} · Score{" "}
                          {item.final_score.toFixed(2)}
                        </p>
                      </div>
                      <Badge tone={toneFromStatus(item.status)}>{item.status}</Badge>
                    </div>
                    {item.reasoning ? (
                      <p className="mt-3 text-sm leading-6 text-slate-300">{item.reasoning}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-[26px] border border-dashed border-white/12 bg-white/4 p-5 text-sm text-slate-400">
              No orchestrated brief has been generated yet. Use the Generate Plan action to
              create the first ranked brief.
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white">Agent Signal Cards</h3>
              <p className="text-sm text-slate-400">
                Snapshot metrics exposed by study, job, and health endpoints.
              </p>
            </div>

            <div className="grid gap-3">
              <div className="rounded-[24px] border border-white/8 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">Study Focus</p>
                  <Badge tone="success">{formatNumber(overview.studyInsights?.pending_sessions)}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  Next topic: {overview.studyInsights?.next_best_topic ?? "Not available"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Current streak {formatNumber(overview.studyInsights?.current_streak_days)} days
                </p>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">Job Search</p>
                  <Badge tone="warning">
                    {formatNumber(overview.jobInsights?.active_applications)}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  Pipeline health {overview.jobInsights?.pipeline_health_score.toFixed(1) ?? "0.0"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Upcoming interviews {formatNumber(overview.jobInsights?.upcoming_interviews)}
                </p>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">Health Routine</p>
                  <Badge tone="success">
                    {formatNumber(overview.healthInsights?.recovery_score)}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  {overview.healthInsights?.recommended_action ?? "Recommendations will surface here."}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Weekly workouts {formatNumber(overview.healthInsights?.weekly_workouts_completed)}
                </p>
              </div>

              {
                // TODO(frontend): Replace this placeholder when the backend /life-admin/insights route is enabled.
              }
              <div className="rounded-[24px] border border-dashed border-white/12 bg-white/4 p-4">
                <p className="text-sm font-medium text-white">Life Admin</p>
                <p className="mt-2 text-sm text-slate-400">
                  The backend does not currently expose `/life-admin/insights`, so this card
                  intentionally stays as a placeholder.
                </p>
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-medium text-white">Recent Notifications</h3>
                <p className="text-sm text-slate-400">Latest delivery history across channels.</p>
              </div>
              <Badge>{formatNumber(overview.notifications.length)}</Badge>
            </div>
            <div className="space-y-3">
              {overview.notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className="rounded-[24px] border border-white/8 bg-slate-900/60 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={toneFromStatus(notification.status)}>
                      {notification.status}
                    </Badge>
                    <Badge>{notification.channel}</Badge>
                  </div>
                  <p className="mt-3 text-sm font-medium text-white">{notification.title}</p>
                  {notification.body ? (
                    <p className="mt-2 text-sm leading-6 text-slate-300">{notification.body}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">
                    {notification.notification_type} · {formatDateTime(notification.sent_at)}
                  </p>
                </div>
              ))}
              {!overview.notifications.length ? (
                <div className="rounded-[24px] border border-dashed border-white/12 bg-white/4 p-4 text-sm text-slate-400">
                  No notification history exists yet.
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
