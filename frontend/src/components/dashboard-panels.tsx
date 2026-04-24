"use client";

import Link from "next/link";
import { useState } from "react";

import {
  approvalsApi,
  healthRoutineApi,
  jobApi,
  lifeAdminApi,
  orchestratorApi,
  studyApi,
} from "@/lib/api";
import { cn, formatNumber, toneFromStatus } from "@/lib/format";
import type {
  Approval,
  GeneratedPlanItem,
  LifeAdminItem,
  PlanBrief,
} from "@/lib/types";
import { useApiQuery } from "@/hooks/use-api-query";
import { Badge, Button } from "@/components/ui";

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator Panel — the brain / final decision layer
// ─────────────────────────────────────────────────────────────────────────────

async function loadOrchestratorData(): Promise<{
  briefs: PlanBrief[];
  approvals: Approval[];
}> {
  const [briefs, approvals] = await Promise.all([
    orchestratorApi.listBriefs(),
    approvalsApi.listPending(),
  ]);
  return { briefs, approvals };
}

export function OrchestratorPanel() {
  const { data, loading, error, reload } = useApiQuery(loadOrchestratorData);
  const [generating, setGenerating] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<number | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await orchestratorApi.generate();
      await reload();
    } finally {
      setGenerating(false);
    }
  };

  const handleFeedback = async (
    itemId: number,
    type: "useful" | "ignored" | "unrealistic" | "completed",
  ) => {
    setFeedbackTarget(itemId);
    try {
      await orchestratorApi.feedback(itemId, { feedback_type: type });
      await reload();
    } finally {
      setFeedbackTarget(null);
    }
  };

  const brief: PlanBrief | undefined = data?.briefs[0];
  const pending: Approval[] = data?.approvals ?? [];

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/8">
            <span className="text-[10px] font-bold tracking-widest text-cyan-200">AI</span>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">
              Brain
            </p>
            <h2 className="text-base font-semibold text-white">Orchestrator</h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pending.length > 0 && (
            <Link href="/approvals">
              <Badge tone="danger">
                {pending.length} approval{pending.length !== 1 ? "s" : ""} pending
              </Badge>
            </Link>
          )}
          {brief && (
            <Link
              href="/orchestrator"
              className="text-xs font-medium text-slate-500 transition hover:text-slate-200"
            >
              Full view →
            </Link>
          )}
          <Button size="sm" variant="secondary" onClick={() => void reload()}>
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => void handleGenerate()}
            disabled={generating || (loading && !data)}
          >
            {generating ? "Generating…" : "Generate Plan"}
          </Button>
        </div>
      </div>

      {/* Body */}
      {loading && !data ? (
        <OrchestratorSkeleton />
      ) : error && !data ? (
        <div className="flex items-center justify-between px-6 py-5">
          <p className="text-sm text-rose-300">{error}</p>
          <button
            onClick={() => void reload()}
            className="text-xs text-slate-400 underline hover:text-white"
          >
            Retry
          </button>
        </div>
      ) : !brief ? (
        <NoPlanEmpty onGenerate={() => void handleGenerate()} generating={generating} />
      ) : (
        <>
          {/* Summary */}
          <div className="border-b border-white/6 bg-white/[0.02] px-6 py-3">
            <p className="text-sm leading-6 text-slate-300">{brief.summary}</p>
          </div>

          {/* Ranked items */}
          <div className="divide-y divide-white/6">
            {brief.items.slice(0, 8).map((item) => (
              <OrchestratorRow
                key={item.id}
                item={item}
                loadingId={feedbackTarget}
                onFeedback={(id, type) => void handleFeedback(id, type)}
              />
            ))}
          </div>

          {brief.items.length > 8 && (
            <div className="border-t border-white/6 px-6 py-3">
              <Link
                href="/orchestrator"
                className="text-xs font-medium text-cyan-300/70 hover:text-cyan-200"
              >
                +{brief.items.length - 8} more — open full brief →
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function OrchestratorRow({
  item,
  loadingId,
  onFeedback,
}: {
  item: GeneratedPlanItem;
  loadingId: number | null;
  onFeedback: (
    id: number,
    type: "useful" | "ignored" | "unrealistic" | "completed",
  ) => void;
}) {
  const isLoading = loadingId === item.id;

  const AGENT_CHIP: Record<string, string> = {
    study: "border-sky-400/30 bg-sky-400/10 text-sky-300",
    job: "border-violet-400/30 bg-violet-400/10 text-violet-300",
    health: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    "life-admin": "border-amber-400/30 bg-amber-400/10 text-amber-300",
    life_admin: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    tasks: "border-slate-400/20 bg-white/5 text-slate-300",
  };
  const chipClass =
    AGENT_CHIP[item.source_agent.toLowerCase()] ??
    "border-slate-400/20 bg-white/5 text-slate-300";

  const FEEDBACK = [
    { type: "completed" as const, symbol: "✓", title: "Mark completed" },
    { type: "useful" as const, symbol: "↑", title: "Useful" },
    { type: "ignored" as const, symbol: "✕", title: "Ignore" },
    { type: "unrealistic" as const, symbol: "↯", title: "Unrealistic" },
  ];

  return (
    <div className="flex items-start gap-3 px-6 py-3.5">
      {/* Rank */}
      <span className="mt-0.5 w-5 shrink-0 text-right text-xs font-semibold text-slate-600">
        {item.rank_position ?? "—"}
      </span>

      {/* Agent chip */}
      <span
        className={cn(
          "mt-0.5 inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]",
          chipClass,
        )}
      >
        {item.source_agent}
      </span>

      {/* Title + reasoning */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-5 text-white">{item.title}</p>
        {item.reasoning && (
          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{item.reasoning}</p>
        )}
      </div>

      {/* Score */}
      <span className="hidden shrink-0 font-mono text-xs text-slate-600 sm:block">
        {item.final_score.toFixed(1)}
      </span>

      {/* Status badge */}
      <Badge tone={toneFromStatus(item.status)} className="hidden shrink-0 sm:inline-flex">
        {item.status}
      </Badge>

      {/* Feedback buttons */}
      <div className="flex shrink-0 items-center gap-1">
        {FEEDBACK.map(({ type, symbol, title }) => (
          <button
            key={type}
            title={title}
            disabled={isLoading}
            onClick={() => onFeedback(item.id, type)}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-white/8 bg-white/4 text-[10px] text-slate-500 transition hover:border-white/20 hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            {symbol}
          </button>
        ))}
      </div>
    </div>
  );
}

function NoPlanEmpty({
  onGenerate,
  generating,
}: {
  onGenerate: () => void;
  generating: boolean;
}) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-sm font-semibold text-white">No plan generated yet</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">
        Run the orchestrator to get a ranked daily execution brief across all your agents and tasks.
      </p>
      <Button className="mt-5" size="sm" onClick={onGenerate} disabled={generating}>
        {generating ? "Generating…" : "Generate Plan"}
      </Button>
    </div>
  );
}

function OrchestratorSkeleton() {
  return (
    <div className="divide-y divide-white/6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-6 py-3.5">
          <div className="h-3 w-4 animate-pulse rounded bg-white/8" />
          <div className="h-5 w-14 animate-pulse rounded-full bg-white/8" />
          <div className="h-3 flex-1 animate-pulse rounded bg-white/8" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-white/8" />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Study Focus Panel
// ─────────────────────────────────────────────────────────────────────────────

export function StudyPanel() {
  const { data, loading, error } = useApiQuery(studyApi.insights);

  const weeklyHours = data?.estimated_weekly_coverage_minutes
    ? `${(data.estimated_weekly_coverage_minutes / 60).toFixed(1)}h`
    : "—";

  return (
    <AgentPanelShell
      label="Study Focus"
      href="/study-focus"
      dotClass="bg-sky-400"
      borderAccent="border-sky-400/20"
      loading={loading}
      error={error}
    >
      <MetricGrid
        metrics={[
          { label: "Next topic", value: data?.next_best_topic ?? "—" },
          { label: "Streak", value: `${formatNumber(data?.current_streak_days)}d` },
          {
            label: "Pending sessions",
            value: formatNumber(data?.pending_sessions),
            tone: data?.pending_sessions ? "warn" : undefined,
          },
          {
            label: "Missed",
            value: formatNumber(data?.missed_sessions),
            tone: data?.missed_sessions ? "danger" : undefined,
          },
          { label: "Weekly coverage", value: weeklyHours },
          { label: "Next subtopic", value: data?.next_best_subtopic ?? "—" },
        ]}
      />
    </AgentPanelShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Job Search Panel
// ─────────────────────────────────────────────────────────────────────────────

export function JobPanel() {
  const { data, loading, error } = useApiQuery(jobApi.insights);

  const weeklyProgress =
    data != null
      ? `${data.weekly_application_count} / ${data.weekly_target_count}`
      : "—";

  return (
    <AgentPanelShell
      label="Job Search"
      href="/job-search"
      dotClass="bg-violet-400"
      borderAccent="border-violet-400/20"
      loading={loading}
      error={error}
    >
      <MetricGrid
        metrics={[
          { label: "Active apps", value: formatNumber(data?.active_applications) },
          {
            label: "Stale",
            value: formatNumber(data?.stale_applications),
            tone: data?.stale_applications ? "warn" : undefined,
          },
          {
            label: "Follow-ups due",
            value: formatNumber(data?.pending_followups),
            tone: data?.pending_followups ? "warn" : undefined,
          },
          { label: "Upcoming interviews", value: formatNumber(data?.upcoming_interviews) },
          { label: "Weekly progress", value: weeklyProgress },
          {
            label: "Pipeline health",
            value:
              data?.pipeline_health_score != null
                ? data.pipeline_health_score.toFixed(1)
                : "—",
          },
        ]}
      />
    </AgentPanelShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Health Routine Panel
// ─────────────────────────────────────────────────────────────────────────────

export function HealthPanel() {
  const { data, loading, error } = useApiQuery(healthRoutineApi.insights);

  const workoutsStr =
    data != null
      ? `${data.weekly_workouts_completed} / ${data.weekly_workout_target}`
      : "—";

  return (
    <AgentPanelShell
      label="Health Routine"
      href="/health-routine"
      dotClass="bg-emerald-400"
      borderAccent="border-emerald-400/20"
      loading={loading}
      error={error}
    >
      <MetricGrid
        metrics={[
          { label: "Recovery score", value: formatNumber(data?.recovery_score) },
          { label: "Workouts (week)", value: workoutsStr },
          {
            label: "Pending recs.",
            value: formatNumber(data?.pending_recommendations),
            tone: data?.pending_recommendations ? "warn" : undefined,
          },
          { label: "Last workout", value: data?.last_workout_type ?? "None" },
          { label: "Recommended", value: data?.recommended_action ?? "—" },
        ]}
      />
    </AgentPanelShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Life Admin Panel
// ─────────────────────────────────────────────────────────────────────────────

async function loadLifeAdminData(): Promise<{ items: LifeAdminItem[]; now: number }> {
  const items = await lifeAdminApi.listItems();
  return { items, now: Date.now() };
}

export function LifeAdminPanel() {
  const { data, loading, error, reload } = useApiQuery(loadLifeAdminData);
  const [captureText, setCaptureText] = useState("");
  const [capturing, setCapturing] = useState(false);

  const allItems = data?.items ?? [];
  const refTime = data?.now ?? 0;

  const pending = allItems.filter(
    (i) => i.status !== "completed" && i.status !== "cancelled",
  );
  const urgent = allItems.filter(
    (i) => i.priority === "high" || i.priority === "critical",
  );
  const escalated = allItems.filter((i) => i.escalation_level > 0);
  const dueSoon = allItems.filter((i) => {
    if (!i.due_at || i.status === "completed") return false;
    const days = (new Date(i.due_at).getTime() - refTime) / 86_400_000;
    return days >= 0 && days <= 7;
  });

  const handleCapture = async () => {
    const text = captureText.trim();
    if (!text) return;
    setCapturing(true);
    try {
      await lifeAdminApi.capture({ raw_text: text });
      setCaptureText("");
      await reload();
    } finally {
      setCapturing(false);
    }
  };

  return (
    <AgentPanelShell
      label="Life Admin"
      href="/life-admin"
      dotClass="bg-amber-400"
      borderAccent="border-amber-400/20"
      loading={loading}
      error={error}
    >
      <MetricGrid
        metrics={[
          { label: "Pending", value: formatNumber(pending.length) },
          {
            label: "Urgent",
            value: formatNumber(urgent.length),
            tone: urgent.length > 0 ? "danger" : undefined,
          },
          {
            label: "Escalated",
            value: formatNumber(escalated.length),
            tone: escalated.length > 0 ? "danger" : undefined,
          },
          {
            label: "Due this week",
            value: formatNumber(dueSoon.length),
            tone: dueSoon.length > 0 ? "warn" : undefined,
          },
          { label: "Next item", value: pending[0]?.title ?? "All clear" },
        ]}
      />

      {/* Quick capture field */}
      <div className="border-t border-white/8 px-5 py-3">
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-600">
          Quick capture
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={captureText}
            onChange={(e) => setCaptureText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCapture();
            }}
            placeholder="e.g. pay electricity bill by Friday"
            className="h-8 flex-1 rounded-lg border border-white/10 bg-slate-900/60 px-3 text-xs text-slate-100 placeholder:text-slate-600 focus:border-cyan-300/40 focus:outline-none"
          />
          <button
            onClick={() => void handleCapture()}
            disabled={capturing || !captureText.trim()}
            className="h-8 rounded-lg border border-white/12 bg-white/6 px-3 text-xs font-medium text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
          >
            {capturing ? "…" : "Add"}
          </button>
        </div>
      </div>
    </AgentPanelShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared panel shell
// ─────────────────────────────────────────────────────────────────────────────

function AgentPanelShell({
  label,
  href,
  dotClass,
  borderAccent,
  loading,
  error,
  children,
}: {
  label: string;
  href: string;
  dotClass: string;
  borderAccent: string;
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn("overflow-hidden rounded-2xl border bg-slate-950/70", borderAccent)}
    >
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", dotClass)} />
          <h3 className="text-sm font-semibold text-white">{label}</h3>
        </div>
        <Link
          href={href}
          className="text-xs font-medium text-slate-500 transition hover:text-slate-200"
        >
          Details →
        </Link>
      </div>

      {loading ? (
        <AgentSkeleton />
      ) : error ? (
        <p className="px-5 py-4 text-xs text-rose-300">{error}</p>
      ) : (
        children
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Metric grid
// ─────────────────────────────────────────────────────────────────────────────

interface MetricEntry {
  label: string;
  value: string | number;
  tone?: "warn" | "danger";
}

function MetricGrid({ metrics }: { metrics: MetricEntry[] }) {
  const rowCount = Math.ceil(metrics.length / 2);

  return (
    <div className="grid grid-cols-2">
      {metrics.map((m, idx) => {
        const isLeft = idx % 2 === 0;
        const rowIndex = Math.floor(idx / 2);
        const isLastRow = rowIndex === rowCount - 1;
        const isOnlyInRow = metrics.length % 2 !== 0 && idx === metrics.length - 1;

        return (
          <div
            key={m.label}
            className={cn(
              "px-5 py-3",
              isLeft && !isOnlyInRow && "border-r border-white/8",
              !isLastRow && "border-b border-white/8",
              isOnlyInRow && "col-span-2",
            )}
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
              {m.label}
            </p>
            <p
              className={cn(
                "mt-0.5 truncate text-sm font-semibold",
                m.tone === "danger"
                  ? "text-rose-300"
                  : m.tone === "warn"
                    ? "text-amber-200"
                    : "text-white",
              )}
            >
              {m.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeletons
// ─────────────────────────────────────────────────────────────────────────────

function AgentSkeleton() {
  return (
    <div className="grid grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "px-5 py-3",
            i % 2 === 0 && "border-r border-white/8",
            i < 2 && "border-b border-white/8",
          )}
        >
          <div className="h-2 w-14 animate-pulse rounded bg-white/8" />
          <div className="mt-2 h-4 w-8 animate-pulse rounded bg-white/8" />
        </div>
      ))}
    </div>
  );
}
