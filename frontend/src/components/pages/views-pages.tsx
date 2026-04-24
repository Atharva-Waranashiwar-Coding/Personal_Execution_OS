"use client";

import { viewsApi } from "@/lib/api";
import { formatDateTime, formatNumber, toneFromPriority, toneFromStatus } from "@/lib/format";
import type { Plan, Task, TodayViewResponse, WeeklyViewResponse } from "@/lib/types";
import { useApiQuery } from "@/hooks/use-api-query";
import {
  Badge,
  Button,
  ErrorState,
  LoadingState,
  SectionHeader,
  StatCard,
  Table,
  type TableColumn,
} from "@/components/ui";

const TASK_COLUMNS: TableColumn<Task>[] = [
  {
    header: "Priority",
    render: (task) => (
      <Badge tone={toneFromPriority(task.priority)}>{task.priority}</Badge>
    ),
    className: "w-28",
  },
  {
    header: "Task",
    render: (task) => (
      <div>
        <p className="font-medium text-white">{task.title}</p>
        {task.description ? (
          <p className="mt-0.5 text-xs text-slate-500">{task.description}</p>
        ) : null}
      </div>
    ),
  },
  {
    header: "Status",
    render: (task) => (
      <Badge tone={toneFromStatus(task.status)}>{task.status}</Badge>
    ),
    className: "w-32",
  },
  {
    header: "Scheduled",
    render: (task) => (
      <span className="text-slate-400">{formatDateTime(task.scheduled_for)}</span>
    ),
    className: "w-40",
  },
  {
    header: "Due",
    render: (task) => (
      <span className="text-slate-400">{formatDateTime(task.due_at)}</span>
    ),
    className: "w-40",
  },
];

const PLAN_COLUMNS: TableColumn<Plan>[] = [
  {
    header: "Plan",
    render: (plan) => (
      <div>
        <p className="font-medium text-white">{plan.title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{plan.plan_type}</p>
      </div>
    ),
  },
  {
    header: "Start",
    render: (plan) => (
      <span className="text-slate-400">{formatDateTime(plan.start_at)}</span>
    ),
    className: "w-40",
  },
  {
    header: "End",
    render: (plan) => (
      <span className="text-slate-400">{formatDateTime(plan.end_at)}</span>
    ),
    className: "w-40",
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
    className: "w-44",
  },
];

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
  const completedCount = viewData.tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="space-y-6">
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Tasks"
          value={formatNumber(viewData.tasks.length)}
          hint={`Tasks in this ${mode === "today" ? "day" : "week"}`}
        />
        <StatCard
          label="Completed"
          value={formatNumber(completedCount)}
          hint={`${viewData.tasks.length ? Math.round((completedCount / viewData.tasks.length) * 100) : 0}% done`}
          tone="success"
        />
        <StatCard
          label="Plans"
          value={formatNumber(viewData.plans.length)}
          hint={`Scheduled plans for this ${mode === "today" ? "day" : "week"}`}
          tone="warning"
        />
      </div>

      {/* Tasks table */}
      <div className="overflow-hidden rounded-[20px] border border-white/10 bg-slate-950/70">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {mode === "today" ? "Today" : "This week"}
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-white">Scheduled Tasks</h2>
          </div>
          <Badge tone="neutral">{viewData.tasks.length} tasks</Badge>
        </div>
        <Table<Task>
          data={viewData.tasks}
          columns={TASK_COLUMNS}
          rowKey={(task) => task.id}
        />
      </div>

      {/* Plans table */}
      <div className="overflow-hidden rounded-[20px] border border-white/10 bg-slate-950/70">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {mode === "today" ? "Today" : "This week"}
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-white">Scheduled Plans</h2>
          </div>
          <Badge tone="neutral">{viewData.plans.length} plans</Badge>
        </div>
        <Table<Plan>
          data={viewData.plans}
          columns={PLAN_COLUMNS}
          rowKey={(plan) => plan.id}
        />
      </div>
    </div>
  );
}

export function TodayPage() {
  return (
    <ViewPage
      mode="today"
      title="Today View"
      description="Focus window for tasks and plans scheduled for today."
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
