"use client";

import Link from "next/link";
import { useState } from "react";

import { integrationsApi } from "@/lib/api";
import { formatCurrency, formatDateTime, formatNumber, toIsoString, toneFromStatus } from "@/lib/format";
import { settledValue } from "@/lib/request";
import type {
  CalendarEventSnapshot,
  GmailActionItem,
  IntegrationSyncLog,
  PromptRunLog,
} from "@/lib/types";
import { useApiQuery } from "@/hooks/use-api-query";
import { Field, FormCard } from "@/components/page-elements";
import {
  Badge,
  Button,
  ErrorState,
  Input,
  LoadingState,
  SectionHeader,
  StatCard,
  Table,
  Textarea,
} from "@/components/ui";

interface IntegrationsData {
  authUrl: string | null;
  calendarEvents: CalendarEventSnapshot[];
  gmailActionItems: GmailActionItem[];
  syncLogs: IntegrationSyncLog[];
  promptLogs: PromptRunLog[];
}

async function loadIntegrationsData(): Promise<IntegrationsData> {
  const results = await Promise.allSettled([
    integrationsApi.getGoogleAuthUrl(),
    integrationsApi.listCalendarEvents(),
    integrationsApi.listGmailActionItems(),
    integrationsApi.listSyncLogs(),
    integrationsApi.listPromptLogs(),
  ]);

  return {
    authUrl: results[0].status === "fulfilled" ? results[0].value.auth_url : null,
    calendarEvents: settledValue(results[1], []),
    gmailActionItems: settledValue(results[2], []),
    syncLogs: settledValue(results[3], []),
    promptLogs: settledValue(results[4], []),
  };
}

export function IntegrationsPage() {
  const { data, error, loading, reload } = useApiQuery(loadIntegrationsData);
  const [calendarForm, setCalendarForm] = useState({
    title: "",
    description: "",
    startAt: "",
    endAt: "",
  });
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  if (loading && !data) {
    return (
      <LoadingState
        title="Loading integrations"
        description="Reading Google auth state, calendar snapshots, Gmail action items, and logs."
      />
    );
  }

  const integrations = data ?? {
    authUrl: null,
    calendarEvents: [],
    gmailActionItems: [],
    syncLogs: [],
    promptLogs: [],
  };

  const runAction = async (name: string, action: () => Promise<void>) => {
    setSubmitting(name);

    try {
      await action();
      await reload();
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Google Integrations"
        title="Integrations"
        description="Handle Google auth, calendar sync, Gmail action items, sync logs, and prompt observability."
        actions={
          <Button variant="secondary" onClick={() => void reload()}>
            Refresh
          </Button>
        }
      />

      {error ? <ErrorState description={error} /> : null}

      {lastMessage ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {lastMessage}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Calendar Events"
          value={formatNumber(integrations.calendarEvents.length)}
          hint="Synced calendar snapshot entries"
        />
        <StatCard
          label="Gmail Actions"
          value={formatNumber(integrations.gmailActionItems.length)}
          hint="Parsed Gmail action items"
          tone="warning"
        />
        <StatCard
          label="Prompt Logs"
          value={formatNumber(integrations.promptLogs.length)}
          hint="Observability records captured"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <FormCard
          badge="Google Auth"
          title="Connect Google"
          description="Start the Google OAuth flow using the backend-generated authorization URL."
        >
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-400">
              The backend exposes a Google auth URL and handles the callback. If credentials are
              not configured server-side, the link may be unavailable.
            </p>
            {integrations.authUrl ? (
              <Link
                href={integrations.authUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-linear-to-r from-cyan-300 via-sky-400 to-teal-300 px-4 text-sm font-medium text-slate-950 shadow-[0_16px_40px_rgba(36,211,255,0.24)] transition hover:brightness-105"
              >
                Open Google Auth URL
              </Link>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/12 bg-white/4 px-4 py-3 text-sm text-slate-400">
                Google auth URL is not currently available.
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                disabled={submitting === "calendar-sync"}
                onClick={() =>
                  void runAction("calendar-sync", async () => {
                    const response = await integrationsApi.syncCalendar();
                    setLastMessage(`Synced ${response.synced_count} calendar events.`);
                  })
                }
              >
                {submitting === "calendar-sync" ? "Syncing..." : "Sync Calendar"}
              </Button>
              <Button
                variant="secondary"
                disabled={submitting === "gmail-sync"}
                onClick={() =>
                  void runAction("gmail-sync", async () => {
                    const response = await integrationsApi.syncGmail();
                    setLastMessage(`Extracted ${response.extracted_count} Gmail action items.`);
                  })
                }
              >
                {submitting === "gmail-sync" ? "Syncing..." : "Sync Gmail"}
              </Button>
            </div>
          </div>
        </FormCard>

        <FormCard
          badge="Calendar Write"
          title="Request calendar write approval"
          description="Create a calendar write approval request without bypassing the backend approval flow."
        >
          <form
            className="space-y-4"
            onSubmit={(event) =>
              void (async () => {
                event.preventDefault();
                await runAction("calendar-request", async () => {
                  const response = await integrationsApi.requestCalendarWrite({
                    title: calendarForm.title,
                    description: calendarForm.description || undefined,
                    start_at: toIsoString(calendarForm.startAt) ?? "",
                    end_at: toIsoString(calendarForm.endAt) ?? "",
                  });
                  setLastMessage(`Created calendar write approval #${response.approval_id}.`);
                  setCalendarForm({
                    title: "",
                    description: "",
                    startAt: "",
                    endAt: "",
                  });
                });
              })()
            }
          >
            <Field label="Title">
              <Input
                value={calendarForm.title}
                onChange={(event) =>
                  setCalendarForm({ ...calendarForm, title: event.target.value })
                }
                required
              />
            </Field>
            <Field label="Description">
              <Textarea
                value={calendarForm.description}
                onChange={(event) =>
                  setCalendarForm({ ...calendarForm, description: event.target.value })
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Start at">
                <Input
                  type="datetime-local"
                  value={calendarForm.startAt}
                  onChange={(event) =>
                    setCalendarForm({ ...calendarForm, startAt: event.target.value })
                  }
                  required
                />
              </Field>
              <Field label="End at">
                <Input
                  type="datetime-local"
                  value={calendarForm.endAt}
                  onChange={(event) =>
                    setCalendarForm({ ...calendarForm, endAt: event.target.value })
                  }
                  required
                />
              </Field>
            </div>
            <Button type="submit" disabled={submitting === "calendar-request"}>
              {submitting === "calendar-request" ? "Submitting..." : "Request Approval"}
            </Button>
          </form>
        </FormCard>
      </div>

      <Table<CalendarEventSnapshot>
        data={integrations.calendarEvents}
        rowKey={(event) => event.id}
        columns={[
          {
            header: "Event",
            render: (event) => (
              <div className="space-y-2">
                <p className="font-medium text-white">{event.title}</p>
                <p className="text-sm text-slate-400">{event.description ?? "No description"}</p>
              </div>
            ),
          },
          {
            header: "Window",
            render: (event) => (
              <div className="space-y-1 text-sm text-slate-300">
                <p>{formatDateTime(event.start_at)}</p>
                <p className="text-xs text-slate-500">{formatDateTime(event.end_at)}</p>
              </div>
            ),
          },
          {
            header: "Source",
            render: (event) => (
              <div className="space-y-1 text-sm text-slate-300">
                <p>{event.source}</p>
                <p className="text-xs text-slate-500">
                  Synced {formatDateTime(event.synced_at)}
                </p>
              </div>
            ),
          },
        ]}
      />

      <Table<GmailActionItem>
        data={integrations.gmailActionItems}
        rowKey={(item) => item.id}
        columns={[
          {
            header: "Action Item",
            render: (item) => (
              <div className="space-y-2">
                <p className="font-medium text-white">{item.extracted_title}</p>
                <p className="text-sm text-slate-400">
                  {item.extracted_description ?? item.snippet ?? "No extracted description"}
                </p>
              </div>
            ),
          },
          {
            header: "Meta",
            render: (item) => (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge tone={toneFromStatus(item.status)}>{item.status}</Badge>
                  {item.approval_id ? <Badge>Approval #{item.approval_id}</Badge> : null}
                </div>
                <p className="text-xs text-slate-500">
                  Deadline {formatDateTime(item.detected_deadline_at)}
                </p>
              </div>
            ),
          },
          {
            header: "Actions",
            render: (item) => (
              <Button
                size="sm"
                variant="secondary"
                disabled={submitting === `gmail-${item.id}`}
                onClick={() =>
                  void runAction(`gmail-${item.id}`, async () => {
                    const response = await integrationsApi.createTaskFromGmailActionItem(item.id);
                    setLastMessage(`Created task #${response.task_id} from Gmail action item.`);
                  })
                }
              >
                {submitting === `gmail-${item.id}` ? "Creating..." : "Create Task"}
              </Button>
            ),
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Table<IntegrationSyncLog>
          data={integrations.syncLogs}
          rowKey={(log) => log.id}
          columns={[
            {
              header: "Sync Log",
              render: (log) => (
                <div className="space-y-2">
                  <p className="font-medium text-white">{log.integration_type}</p>
                  <Badge tone={toneFromStatus(log.status)}>{log.status}</Badge>
                </div>
              ),
            },
            {
              header: "Processed",
              render: (log) => (
                <div className="space-y-1 text-sm text-slate-300">
                  <p>{formatNumber(log.records_processed)} records</p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(log.started_at)} to {formatDateTime(log.finished_at)}
                  </p>
                </div>
              ),
            },
          ]}
        />

        <Table<PromptRunLog>
          data={integrations.promptLogs}
          rowKey={(log) => log.id}
          columns={[
            {
              header: "Prompt Run",
              render: (log) => (
                <div className="space-y-2">
                  <p className="font-medium text-white">{log.feature_name}</p>
                  <p className="text-xs text-slate-500">
                    {log.provider} · {log.model}
                  </p>
                </div>
              ),
            },
            {
              header: "Tokens / Cost",
              render: (log) => (
                <div className="space-y-1 text-sm text-slate-300">
                  <p>
                    {formatNumber(log.input_tokens)} in / {formatNumber(log.output_tokens)} out
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatCurrency(log.estimated_cost)} · {log.status}
                  </p>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
