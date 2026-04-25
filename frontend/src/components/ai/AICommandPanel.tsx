"use client";

import { useState } from "react";

import { aiApi } from "@/lib/api";
import { cn, formatDateTime, toneFromStatus } from "@/lib/format";
import type { AICommandResponse, AICommandToolCall } from "@/types/ai";
import { Badge, Button } from "@/components/ui";

interface AICommandPanelProps {
  onCommandComplete?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ToolCallRow({ call }: { call: AICommandToolCall }) {
  const isOk = call.status === "success" || call.status === "completed";
  const isFailed = call.status === "failed" || call.status === "error";

  return (
    <div className="flex items-start gap-3 py-2">
      <span className="mt-0.5 w-5 shrink-0 text-right text-xs font-semibold text-slate-600">
        {call.sequence_number}
      </span>
      <span
        className={cn(
          "mt-0.5 text-xs font-mono font-medium",
          isOk ? "text-emerald-300" : isFailed ? "text-rose-300" : "text-slate-300",
        )}
      >
        {call.tool_name}
      </span>
      <Badge
        tone={isOk ? "success" : isFailed ? "danger" : "neutral"}
        className="ml-auto shrink-0"
      >
        {call.status}
      </Badge>
      {call.error_message && (
        <p className="col-span-full mt-0.5 text-xs text-rose-300">{call.error_message}</p>
      )}
    </div>
  );
}

function CommandResult({
  result,
  onRevise,
  revising,
}: {
  result: AICommandResponse;
  onRevise: (msg: string) => void;
  revising: boolean;
}) {
  const [reviseText, setReviseText] = useState("");
  const hasFailed = result.status === "failed" || result.status === "error";

  return (
    <div className="border-t border-white/8 pt-5 space-y-4">
      {/* Intent + status row */}
      <div className="flex flex-wrap items-center gap-2">
        {result.intent && (
          <span className="inline-flex items-center rounded-full border border-cyan-300/25 bg-cyan-300/8 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200">
            {result.intent}
          </span>
        )}
        <Badge tone={toneFromStatus(result.status)}>{result.status}</Badge>
        <span className="ml-auto text-xs text-slate-500">
          {formatDateTime(result.created_at)}
        </span>
      </div>

      {/* Assistant message */}
      {result.assistant_message && (
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
          <p className="text-sm leading-6 text-slate-200">{result.assistant_message}</p>
        </div>
      )}

      {/* Error */}
      {hasFailed && result.error_message && (
        <div className="rounded-xl border border-rose-400/20 bg-rose-500/8 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-400">
            Error
          </p>
          <p className="mt-1 text-sm text-rose-200">{result.error_message}</p>
        </div>
      )}

      {/* Tool calls */}
      {result.tool_calls.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-white/[0.02]">
          <div className="border-b border-white/8 px-4 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Actions executed ({result.tool_calls.length})
            </p>
          </div>
          <div className="divide-y divide-white/6 px-4">
            {result.tool_calls.map((call) => (
              <ToolCallRow key={call.id} call={call} />
            ))}
          </div>
        </div>
      )}

      {/* Revision input — only when not already failed */}
      <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Revise this command
        </p>
        <div className="flex gap-2">
          <textarea
            value={reviseText}
            onChange={(e) => setReviseText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && reviseText.trim()) {
                onRevise(reviseText);
              }
            }}
            placeholder="Describe what to change…"
            rows={2}
            className="flex-1 resize-none rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-300/40 focus:outline-none"
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={revising || !reviseText.trim()}
            onClick={() => {
              onRevise(reviseText);
              setReviseText("");
            }}
            className="self-end"
          >
            {revising ? "Revising…" : "Revise"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main panel
// ─────────────────────────────────────────────────────────────────────────────

export function AICommandPanel({ onCommandComplete }: AICommandPanelProps) {
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [revising, setRevising] = useState(false);
  const [result, setResult] = useState<AICommandResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    const message = input.trim();
    if (!message) return;

    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const response = await aiApi.command({ message });
      setResult(response);
      setInput("");
      onCommandComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Command failed.");
    } finally {
      setRunning(false);
    }
  };

  const handleRevise = async (reviseMessage: string) => {
    if (!result || !reviseMessage.trim()) return;

    setRevising(true);
    setError(null);

    try {
      const revised = await aiApi.revise(result.id, { message: reviseMessage });
      setResult(revised);
      onCommandComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revision failed.");
    } finally {
      setRevising(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-cyan-300/15 bg-slate-950/70">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/8 px-6 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/8">
          <span className="text-[10px] font-bold tracking-widest text-cyan-200">AI</span>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">
            Natural Language
          </p>
          <h2 className="text-base font-semibold text-white">AI Command Layer</h2>
        </div>
      </div>

      {/* Input area */}
      <div className="px-6 py-5 space-y-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && input.trim() && !running) {
              void handleRun();
            }
          }}
          placeholder="I have a system design interview in 3 weeks. Create a study plan."
          rows={3}
          className="w-full resize-none rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-300/40 focus:outline-none"
        />

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            ⌘ + Enter to run
          </p>
          <Button
            onClick={() => void handleRun()}
            disabled={running || !input.trim()}
            size="sm"
          >
            {running ? "Running…" : "Run Command"}
          </Button>
        </div>

        {/* Network error (separate from command-level errors shown in result) */}
        {error && !result && (
          <div className="rounded-xl border border-rose-400/20 bg-rose-500/8 px-4 py-3">
            <p className="text-sm text-rose-200">{error}</p>
          </div>
        )}

        {/* Loading indicator */}
        {running && (
          <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <p className="text-sm text-slate-400">Processing command…</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <CommandResult
            result={result}
            onRevise={(msg) => void handleRevise(msg)}
            revising={revising}
          />
        )}
      </div>
    </section>
  );
}
