"use client";

import { useState } from "react";

import { analyticsApi, orchestratorApi } from "@/lib/api";
import { AICommandBox } from "@/components/ai/AICommandBox";
import {
  formatDateTime,
  formatNumber,
  toneFromStatus,
} from "@/lib/format";
import { settledValue } from "@/lib/request";
import type { AnalyticsSummaryResponse, GeneratedPlanItem, PlanBrief } from "@/lib/types";
import { useApiQuery } from "@/hooks/use-api-query";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  LoadingState,
  SectionHeader,
  StatCard,
} from "@/components/ui";

interface OrchestratorData {
  briefs: PlanBrief[];
  analytics: AnalyticsSummaryResponse | null;
}

async function loadOrchestrator(): Promise<OrchestratorData> {
  const results = await Promise.allSettled([
    orchestratorApi.listBriefs(),
    analyticsApi.summary(),
  ]);

  return {
    briefs: settledValue(results[0], []),
    analytics: settledValue(results[1], null),
  };
}

const feedbackActions = [
  { label: "Useful", value: "useful" as const },
  { label: "Ignored", value: "ignored" as const },
  { label: "Unrealistic", value: "unrealistic" as const },
  { label: "Completed", value: "completed" as const },
];

function PlanItemCard({
  item,
  onFeedback,
  pendingFeedback,
}: {
  item: GeneratedPlanItem;
  onFeedback: (itemId: number, feedbackType: typeof feedbackActions[number]["value"]) => Promise<void>;
  pendingFeedback: string | null;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-slate-900/65 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">Rank {item.rank_position ?? "?"}</Badge>
            <Badge>{item.source_agent}</Badge>
            <Badge tone={toneFromStatus(item.status)}>{item.status}</Badge>
          </div>
          <div>
            <h4 className="text-lg font-medium text-white">{item.title}</h4>
            <p className="mt-1 text-sm text-slate-400">{item.item_type}</p>
          </div>
        </div>
        <div className="rounded-3xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/70">Final score</p>
          <p className="mt-2 text-2xl font-semibold text-white">{item.final_score.toFixed(2)}</p>
        </div>
      </div>

      {item.description ? (
        <p className="mt-4 text-sm leading-7 text-slate-200">{item.description}</p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Priority</p>
          <p className="mt-2 text-sm text-white">{item.priority_score.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Urgency</p>
          <p className="mt-2 text-sm text-white">{item.urgency_score.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Feasibility</p>
          <p className="mt-2 text-sm text-white">{item.feasibility_score.toFixed(2)}</p>
        </div>
      </div>

      <div className="mt-4 rounded-[24px] border border-white/8 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Reasoning</p>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          {item.reasoning ?? "No reasoning string was returned for this item."}
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Window {formatDateTime(item.recommended_start_at)} to{" "}
          {formatDateTime(item.recommended_end_at)}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {feedbackActions.map((action) => (
          <Button
            key={action.value}
            size="sm"
            variant={action.value === "completed" ? "primary" : "secondary"}
            disabled={pendingFeedback === action.value}
            onClick={() => void onFeedback(item.id, action.value)}
          >
            {pendingFeedback === action.value ? "Saving..." : action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function OrchestratorPage() {
  const { data, error, loading, reload } = useApiQuery(loadOrchestrator);
  const [generating, setGenerating] = useState(false);
  const [pendingFeedback, setPendingFeedback] = useState<Record<number, string | null>>({});

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
    feedbackType: typeof feedbackActions[number]["value"],
  ) => {
    setPendingFeedback((current) => ({ ...current, [itemId]: feedbackType }));

    try {
      await orchestratorApi.feedback(itemId, { feedback_type: feedbackType });
      await reload();
    } finally {
      setPendingFeedback((current) => ({ ...current, [itemId]: null }));
    }
  };

  if (loading && !data) {
    return (
      <LoadingState
        title="Loading orchestrator"
        description="Reading stored briefs and ranked plan items."
      />
    );
  }

  const briefs = data?.briefs ?? [];
  const analytics = data?.analytics;

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Multi-Agent Planning"
        title="Orchestrator"
        description="Generate ranked execution briefs, inspect source agents, and capture plan feedback."
        actions={
          <>
            <Button variant="secondary" onClick={() => void reload()}>
              Refresh
            </Button>
            <Button onClick={() => void handleGenerate()} disabled={generating}>
              {generating ? "Generating..." : "Generate Plan"}
            </Button>
          </>
        }
      />

      {error ? <ErrorState description={error} /> : null}

      <AICommandBox
        placeholder="Generate an updated execution plan, or ask the orchestrator to re-prioritize based on my current status."
        examples={[
          "Generate a fresh execution plan across all agents.",
          "What should I focus on this week given my interviews and study goals?",
          "Re-prioritize my plan items based on deadlines.",
        ]}
        onComplete={() => void reload()}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Brief Count" value={formatNumber(briefs.length)} hint="Stored orchestrated briefs" />
        <StatCard
          label="Useful Feedback"
          value={formatNumber(analytics?.useful_feedback_count)}
          hint="Feedback records marked useful"
          tone="success"
        />
        <StatCard
          label="Ignored Feedback"
          value={formatNumber(analytics?.ignored_feedback_count)}
          hint="Plan items the user skipped"
          tone="warning"
        />
        <StatCard
          label="Completed Feedback"
          value={formatNumber(analytics?.completed_feedback_count)}
          hint="Plan items confirmed complete"
          tone="success"
        />
      </div>

      <div className="space-y-5">
        {briefs.map((brief) => (
          <Card key={brief.id} className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="success">{formatDateTime(brief.brief_date)}</Badge>
                  <Badge>{brief.created_by}</Badge>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold tracking-[-0.05em] text-white">
                    Brief #{brief.id}
                  </h3>
                  <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-300">
                    {brief.summary}
                  </p>
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Items</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {formatNumber(brief.items.length)}
                </p>
              </div>
            </div>

            {brief.context_snapshot ? (
              <div className="rounded-[24px] border border-white/8 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Context snapshot</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">{brief.context_snapshot}</p>
              </div>
            ) : null}

            <div className="space-y-4">
              {brief.items.map((item) => (
                <PlanItemCard
                  key={item.id}
                  item={item}
                  onFeedback={handleFeedback}
                  pendingFeedback={pendingFeedback[item.id] ?? null}
                />
              ))}
              {!brief.items.length ? (
                <div className="rounded-[24px] border border-dashed border-white/12 bg-white/4 p-5 text-sm text-slate-400">
                  This brief has no stored plan items.
                </div>
              ) : null}
            </div>
          </Card>
        ))}

        {!briefs.length ? (
          <Card className="border-dashed border-white/12 bg-white/4">
            <div className="space-y-3 py-6 text-center">
              <p className="text-lg font-medium text-white">No orchestrated briefs yet</p>
              <p className="text-sm leading-6 text-slate-400">
                Generate the first orchestrated plan to create ranked items and feedback flows.
              </p>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
