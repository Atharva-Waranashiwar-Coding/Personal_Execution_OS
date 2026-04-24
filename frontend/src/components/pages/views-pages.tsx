"use client";

import { viewsApi } from "@/lib/api";
import { formatDateTime, formatNumber, toneFromPriority, toneFromStatus } from "@/lib/format";
import type { Plan, Task, TodayViewResponse, WeeklyViewResponse } from "@/lib/types";
import { useApiQuery } from "@/hooks/use-api-query";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  LoadingState,
  SectionHeader,
  StatCard,
  Table,
} from "@/components/ui";

function ScheduledTaskCard({ task }: { task: Task }) {
  return (
    <div className="rounded-[26px] border border-white/8 bg-slate-900/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={toneFromPriority(task.priority)}>{task.priority}</Badge>
        <Badge tone={toneFromStatus(task.status)}>{task.status}</Badge>
      </div>
      <p className="mt-3 text-sm font-medium text-white">{task.title}</p>
      {task.description ? (
        <p className="mt-2 text-sm leading-6 text-slate-300">{task.description}</p>
      ) : null}
      <p className="mt-3 text-xs text-slate-500">
        Scheduled {formatDateTime(task.scheduled_for)} · Due {formatDateTime(task.due_at)}
      </p>
    </div>
  );
}

function ViewPage({
  title,
  description,
  loader,
  mode,
}: {
  title: string;
  description: string;
  loader: () => Promise<TodayViewResponse | WeeklyViewResponse>;
  mode: "today" | "weekly";
}) {
  const { data, error, loading, reload } = useApiQuery(loader);

  if (loading && !data) {
    return (
      <LoadingState
        title={`Loading ${mode} view`}
        description="Reading the backend task and plan projections."
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

  const viewData = data ?? { tasks: [], plans: [] };

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow={mode === "today" ? "Immediate Horizon" : "Seven-Day Horizon"}
        title={title}
        description={description}
        actions={
          <Button variant="secondary" onClick={() => void reload()}>
            Refresh
          </Button>
        }
      />

      {error ? <ErrorState title="Partial data issue" description={error} /> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Tasks"
          value={formatNumber(viewData.tasks.length)}
          hint={`Tasks returned from the ${mode} API route`}
          tone="success"
        />
        <StatCard
          label="Plans"
          value={formatNumber(viewData.plans.length)}
          hint={`Plan records scheduled for this ${mode === "today" ? "day" : "week"}`}
        />
        <StatCard
          label="Completed Tasks"
          value={formatNumber(viewData.tasks.filter((task) => task.status === "completed").length)}
          hint="Execution already marked done"
          tone="warning"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="space-y-5">
          <div>
            <h3 className="text-lg font-medium text-white">Scheduled Tasks</h3>
            <p className="text-sm text-slate-400">
              Ordered by scheduled time and due date by the backend view endpoint.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {viewData.tasks.map((task) => (
              <ScheduledTaskCard key={task.id} task={task} />
            ))}
            {!viewData.tasks.length ? (
              <div className="rounded-[26px] border border-dashed border-white/12 bg-white/4 p-5 text-sm text-slate-400 md:col-span-2">
                No tasks were returned for this window.
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <h3 className="text-lg font-medium text-white">Scheduled Plans</h3>
            <p className="text-sm text-slate-400">
              Plans that start inside the selected viewing range.
            </p>
          </div>
          <Table<Plan>
            data={viewData.plans}
            rowKey={(plan) => plan.id}
            columns={[
              {
                header: "Plan",
                render: (plan) => (
                  <div className="space-y-1">
                    <p className="font-medium text-white">{plan.title}</p>
                    <p className="text-xs text-slate-500">{plan.plan_type}</p>
                  </div>
                ),
              },
              {
                header: "Window",
                render: (plan) => (
                  <div className="space-y-1 text-sm text-slate-300">
                    <p>{formatDateTime(plan.start_at)}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(plan.end_at)}</p>
                  </div>
                ),
              },
              {
                header: "Status",
                render: (plan) => (
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={toneFromStatus(plan.status)}>{plan.status}</Badge>
                    {plan.adherence_status ? (
                      <Badge tone={toneFromStatus(plan.adherence_status)}>
                        {plan.adherence_status}
                      </Badge>
                    ) : null}
                  </div>
                ),
              },
            ]}
            emptyState={
              <div className="rounded-[26px] border border-dashed border-white/12 bg-white/4 p-5 text-sm text-slate-400">
                No plans are scheduled inside this view yet.
              </div>
            }
          />
        </Card>
      </div>
    </div>
  );
}

export function TodayPage() {
  return (
    <ViewPage
      mode="today"
      title="Today View"
      description="Focus window for tasks and plans scheduled today."
      loader={viewsApi.today}
    />
  );
}

export function WeeklyPage() {
  return (
    <ViewPage
      mode="weekly"
      title="Weekly View"
      description="Seven-day planning horizon across tasks and scheduled plans."
      loader={viewsApi.weekly}
    />
  );
}
