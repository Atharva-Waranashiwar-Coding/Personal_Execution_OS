"use client";

import { useState } from "react";

import { aiApi } from "@/lib/api";
import { toneFromStatus } from "@/lib/format";
import type { AICommandResponse } from "@/types/ai";
import { Badge, Button } from "@/components/ui";

interface AICommandBoxProps {
  placeholder?: string;
  examples?: string[];
  onComplete?: () => void;
}

export function AICommandBox({ placeholder, examples = [], onComplete }: AICommandBoxProps) {
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AICommandResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async (message: string) => {
    const msg = message.trim();
    if (!msg || running) return;

    setRunning(true);
    setError(null);
    setResult(null);
    setInput("");

    try {
      const response = await aiApi.command({ message: msg });
      setResult(response);
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Command failed.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-cyan-300/15 bg-slate-950/60">
      <div className="space-y-3 px-5 pb-4 pt-5">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && input.trim() && !running) {
              void handleRun(input);
            }
          }}
          placeholder={placeholder ?? "Tell the AI what to do…"}
          rows={2}
          className="w-full resize-none rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-300/40 focus:outline-none"
        />

        {examples.length > 0 && !input && !result && (
          <div className="flex flex-wrap gap-2">
            {examples.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => void handleRun(ex)}
                disabled={running}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400 transition hover:border-cyan-300/30 hover:bg-cyan-300/8 hover:text-cyan-200 disabled:opacity-50"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-600">⌘ + Enter to run</p>
          <Button
            size="sm"
            onClick={() => void handleRun(input)}
            disabled={running || !input.trim()}
          >
            {running ? "Running…" : "Run"}
          </Button>
        </div>

        {running && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <p className="text-xs text-slate-500">Processing…</p>
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-rose-400/20 bg-rose-500/8 px-3 py-2 text-xs text-rose-200">
            {error}
          </p>
        )}

        {result && (
          <div className="space-y-2 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
            <div className="flex items-center gap-2">
              <Badge tone={toneFromStatus(result.status)}>{result.status}</Badge>
              {result.intent && (
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300/70">
                  {result.intent}
                </span>
              )}
              <button
                type="button"
                onClick={() => setResult(null)}
                className="ml-auto text-xs text-slate-600 hover:text-slate-400"
              >
                dismiss
              </button>
            </div>
            {result.assistant_message && (
              <p className="text-sm leading-6 text-slate-300">{result.assistant_message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
