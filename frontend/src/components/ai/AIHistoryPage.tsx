"use client";

import { aiApi } from "@/lib/api";
import { cn, formatDateTime, toneFromStatus } from "@/lib/format";
import type { AICommandResponse, AICommandToolCall } from "@/types/ai";
import { useApiQuery } from "@/hooks/use-api-query";
import { Badge, Button, EmptyState, ErrorState, LoadingState, SectionHeader } from "@/components/ui";

// ─────────────────────────────────────────────────────────────────────────────
// Tool call inline row
// ─────────────────────────────────────────────────────────────────────────────

function ToolCallBadge({ call }: { call: AICommandToolCall }) {
  const isOk = call.status === "success" || call.status === "completed";
  const isFailed = call.status === "failed" || call.status === "error";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono font-medium",
        isOk
          ? "border-emerald-400/25 bg-emerald-400/8 text-emerald-300"
          : isFailed
            ? "border-rose-400/25 bg-rose-400/8 text-rose-300"
            : "border-white/10 bg-white/5 text-slate-400",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isOk ? "bg-emerald-400" : isFailed ? "bg-rose-400" : "bg-slate-500",
        )}
      />
      {call.tool_name}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Single command card
// ─────────────────────────────────────────────────────────────────────────────

function CommandCard({ cmd }: { cmd: AICommandResponse }) {
  const hasFailed = cmd.status === "failed" || cmd.status === "error";

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70">
      {/* Card header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/8 px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">{cmd.message}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {cmd.intent && (
              <span className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
                {cmd.intent}
              </span>
            )}
            <Badge tone={toneFromStatus(cmd.status)}>{cmd.status}</Badge>
          </div>
        </div>
        <time className="shrink-0 text-xs text-slate-500">
          {formatDateTime(cmd.created_at)}
        </time>
      </div>

      {/* Assistant message */}
      {cmd.assistant_message && (
        <div className="border-b border-white/6 bg-white/[0.015] px-5 py-3">
          <p className="text-sm leading-6 text-slate-300">{cmd.assistant_message}</p>
        </div>
      )}

      {/* Error */}
      {hasFailed && cmd.error_message && (
        <div className="border-b border-rose-400/15 bg-rose-500/6 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-400">
            Error
          </p>
          <p className="mt-0.5 text-sm text-rose-200">{cmd.error_message}</p>
        </div>
      )}

      {/* Tool calls */}
      {cmd.tool_calls.length > 0 && (
        <div className="flex flex-wrap gap-2 px-5 py-3">
          <p className="w-full text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            Actions ({cmd.tool_calls.length})
          </p>
          {cmd.tool_calls.map((call) => (
            <ToolCallBadge key={call.id} call={call} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export function AIHistoryPage() {
  const { data: commands, loading, error, reload } = useApiQuery(aiApi.listCommands);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="AI Command Layer"
        title="Command History"
        description="All natural language commands you have run, with intent, status, and tool execution details."
        actions={
          <Button variant="secondary" size="sm" onClick={() => void reload()}>
            Refresh
          </Button>
        }
      />

      {loading && !commands && (
        <LoadingState
          title="Loading command history"
          description="Fetching your AI command records."
        />
      )}

      {error && !commands && (
        <ErrorState
          description={error}
          action={
            <Button variant="secondary" onClick={() => void reload()}>
              Retry
            </Button>
          }
        />
      )}

      {commands && commands.length === 0 && (
        <EmptyState
          title="No commands yet"
          description="Use the AI Command Layer on the dashboard to run your first natural language command."
        />
      )}

      {commands && commands.length > 0 && (
        <div className="space-y-3">
          {commands.map((cmd) => (
            <CommandCard key={cmd.id} cmd={cmd} />
          ))}
        </div>
      )}
    </div>
  );
}
