"use client";

import { useMemo, useState } from "react";

import { lifeAdminApi } from "@/lib/api";
import { formatDateTime, formatNumber, safeJsonParse, toIsoString, toneFromPriority, toneFromStatus } from "@/lib/format";
import type { LifeAdminCapture, LifeAdminItem, LifeAdminRecurrence } from "@/lib/types";
import { useApiQuery } from "@/hooks/use-api-query";
import { Field, FormCard, KeyValueList } from "@/components/page-elements";
import {
  AdvancedSection,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  JsonPreview,
  LoadingState,
  SectionHeader,
  Select,
  StatCard,
  Table,
  Textarea,
} from "@/components/ui";

interface LifeAdminData {
  items: LifeAdminItem[];
  recurrences: LifeAdminRecurrence[];
}

const EMPTY_ITEMS: LifeAdminItem[] = [];
const EMPTY_RECURRENCES: LifeAdminRecurrence[] = [];

async function loadLifeAdminData(): Promise<LifeAdminData> {
  const [items, recurrences] = await Promise.all([
    lifeAdminApi.listItems(),
    lifeAdminApi.listRecurrences(),
  ]);
  return { items, recurrences };
}

export function LifeAdminPage() {
  const { data, error, loading, reload } = useApiQuery(loadLifeAdminData);
  const [itemForm, setItemForm] = useState({
    itemType: "bill", title: "", description: "", status: "pending", priority: "medium",
    dueAt: "", scheduledFor: "", isRecurringTemplate: "false", reminderRequired: "true", source: "manual",
  });
  const [captureText, setCaptureText] = useState("");
  const [recurrenceForm, setRecurrenceForm] = useState({
    itemId: "", recurrenceRule: "", leadTimeDays: "3", nextDueAt: "",
  });
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [lastCapture, setLastCapture] = useState<LifeAdminCapture | null>(null);
  const [lastReminderMessage, setLastReminderMessage] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const items = data?.items ?? EMPTY_ITEMS;
  const recurrences = data?.recurrences ?? EMPTY_RECURRENCES;

  const derivedInsights = useMemo(() => {
    const urgentItems = items.filter((item) => {
      if (!item.due_at || item.status === "completed") return false;
      const dueAt = new Date(item.due_at).getTime();
      return dueAt <= now + 3 * 24 * 60 * 60 * 1000;
    }).length;

    return {
      pending: items.filter((item) => item.status === "pending").length,
      escalated: items.filter((item) => item.escalation_level > 0).length,
      urgent: urgentItems,
      reminders: items.filter((item) => item.reminder_required).length,
    };
  }, [items, now]);

  const urgentItems = useMemo(
    () =>
      items
        .filter((item) => {
          if (!item.due_at || item.status === "completed") return false;
          const dueAt = new Date(item.due_at).getTime();
          return dueAt <= now + 3 * 24 * 60 * 60 * 1000;
        })
        .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime()),
    [items, now],
  );

  if (loading && !data) {
    return (
      <LoadingState
        title="Loading life admin"
        description="Pulling admin items, recurrences, and reminder state."
      />
    );
  }

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
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Life Admin Agent"
        title="Life Admin"
        description="Capture tasks in plain language and let the AI handle parsing, scheduling, and reminders."
        actions={
          <Button variant="secondary" size="sm" onClick={() => void reload()}>
            Refresh
          </Button>
        }
      />

      {error ? <ErrorState description={error} /> : null}

      {/* Quick Capture — stays visible, not in Advanced */}
      <div className="overflow-hidden rounded-2xl border border-amber-400/15 bg-slate-950/60">
        <div className="border-b border-white/6 px-5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-400/70">
            Quick Capture
          </p>
        </div>
        <form
          className="space-y-3 px-5 pb-4 pt-4"
          onSubmit={(e) =>
            void (async () => {
              e.preventDefault();
              await runAction("capture", async () => {
                const capture = await lifeAdminApi.capture({ raw_text: captureText });
                setLastCapture(capture);
                setCaptureText("");
              });
            })()
          }
        >
          <Textarea
            value={captureText}
            onChange={(e) => setCaptureText(e.target.value)}
            placeholder="Pay the electric bill next Tuesday and remind me two days before."
            className="min-h-[80px]"
            required
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-600">Describe any admin task in plain language</p>
            <Button size="sm" type="submit" disabled={submitting === "capture" || !captureText.trim()}>
              {submitting === "capture" ? "Capturing…" : "Capture"}
            </Button>
          </div>

          {lastCapture && (
            <div className="space-y-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <Badge tone={toneFromStatus(lastCapture.status)}>{lastCapture.status}</Badge>
                <button
                  type="button"
                  onClick={() => setLastCapture(null)}
                  className="text-xs text-slate-600 hover:text-slate-400"
                >
                  dismiss
                </button>
              </div>
              <KeyValueList
                items={[{ label: "Captured text", value: lastCapture.raw_text }]}
              />
              <JsonPreview
                title="Parsed payload"
                value={safeJsonParse(lastCapture.normalized_payload)}
              />
            </div>
          )}
        </form>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending Items"
          value={formatNumber(derivedInsights.pending)}
          hint="Admin work still open"
        />
        <StatCard
          label="Urgent (≤ 3 days)"
          value={formatNumber(derivedInsights.urgent)}
          hint="Due within three days"
          tone="danger"
        />
        <StatCard
          label="Escalated"
          value={formatNumber(derivedInsights.escalated)}
          hint="Items with escalation applied"
          tone="warning"
        />
        <StatCard
          label="Reminder Coverage"
          value={formatNumber(derivedInsights.reminders)}
          hint="Items with reminders enabled"
          tone="success"
        />
      </div>

      {/* Automation actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          size="sm"
          variant="secondary"
          disabled={submitting === "generate"}
          onClick={() =>
            void runAction("generate", async () => {
              await lifeAdminApi.generateRecurrences();
            })
          }
        >
          {submitting === "generate" ? "Generating…" : "Generate Recurrences"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={submitting === "escalate"}
          onClick={() =>
            void runAction("escalate", async () => {
              await lifeAdminApi.escalate();
            })
          }
        >
          {submitting === "escalate" ? "Escalating…" : "Escalate Items"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={submitting === "schedule"}
          onClick={() =>
            void runAction("schedule", async () => {
              const response = await lifeAdminApi.scheduleReminders();
              setLastReminderMessage(`Scheduled ${response.created_count} reminders.`);
            })
          }
        >
          {submitting === "schedule" ? "Scheduling…" : "Schedule Reminders"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={submitting === "send"}
          onClick={() =>
            void runAction("send", async () => {
              const response = await lifeAdminApi.sendReminders();
              setLastReminderMessage(`Sent ${response.sent_count} reminders.`);
            })
          }
        >
          {submitting === "send" ? "Sending…" : "Send Due Reminders"}
        </Button>
      </div>

      {lastReminderMessage && (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {lastReminderMessage}
        </div>
      )}

      {/* Urgent items */}
      {urgentItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">Urgent — Due Soon</h3>
          <div className="grid gap-3">
            {urgentItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-4 rounded-2xl border border-rose-400/15 bg-rose-500/5 px-5 py-4"
              >
                <div className="space-y-1.5">
                  <p className="font-medium text-white">{item.title}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{item.item_type}</Badge>
                    <Badge tone={toneFromPriority(item.priority)}>{item.priority}</Badge>
                    {item.escalation_level > 0 && (
                      <Badge tone="danger">Escalation {item.escalation_level}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-rose-400">Due {formatDateTime(item.due_at)}</p>
                </div>
                <Badge tone={toneFromStatus(item.status)}>{item.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All items */}
      {items.length === 0 ? (
        <EmptyState
          title="No life admin items yet"
          description="Use the Quick Capture above to describe any task, bill, appointment, or chore in plain language."
        />
      ) : (
        <Table<LifeAdminItem>
          data={items}
          rowKey={(item) => item.id}
          columns={[
            {
              header: "Item",
              render: (item) => (
                <div className="space-y-1.5">
                  <p className="font-medium text-white">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-slate-500">{item.description}</p>
                  )}
                </div>
              ),
            },
            {
              header: "Type & Priority",
              render: (item) => (
                <div className="flex flex-wrap gap-1.5">
                  <Badge>{item.item_type}</Badge>
                  <Badge tone={toneFromPriority(item.priority)}>{item.priority}</Badge>
                  {item.escalation_level > 0 && (
                    <Badge tone="danger">Esc {item.escalation_level}</Badge>
                  )}
                </div>
              ),
            },
            {
              header: "Status & Due",
              render: (item) => (
                <div className="space-y-1">
                  <Badge tone={toneFromStatus(item.status)}>{item.status}</Badge>
                  <p className="text-xs text-slate-500">Due {formatDateTime(item.due_at)}</p>
                </div>
              ),
            },
          ]}
        />
      )}

      {/* Advanced — manual CRUD */}
      <AdvancedSection title="Advanced — Manual Controls">
        {/* Create item manually */}
        <FormCard
          badge="Manual entry"
          title="Create life admin item"
          description="Directly create a structured item when you already know the type and date."
        >
          <form
            className="space-y-4"
            onSubmit={(e) =>
              void (async () => {
                e.preventDefault();
                await runAction("item", async () => {
                  await lifeAdminApi.createItem({
                    item_type: itemForm.itemType,
                    title: itemForm.title,
                    description: itemForm.description || undefined,
                    status: itemForm.status,
                    priority: itemForm.priority,
                    due_at: toIsoString(itemForm.dueAt),
                    scheduled_for: toIsoString(itemForm.scheduledFor),
                    is_recurring_template: itemForm.isRecurringTemplate === "true",
                    reminder_required: itemForm.reminderRequired === "true",
                    source: itemForm.source,
                  });
                  setItemForm({
                    itemType: "bill", title: "", description: "", status: "pending", priority: "medium",
                    dueAt: "", scheduledFor: "", isRecurringTemplate: "false", reminderRequired: "true", source: "manual",
                  });
                });
              })()
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Item type">
                <Select value={itemForm.itemType} onChange={(e) => setItemForm({ ...itemForm, itemType: e.target.value })}>
                  {["bill", "errand", "renewal", "appointment", "household"].map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Priority">
                <Select value={itemForm.priority} onChange={(e) => setItemForm({ ...itemForm, priority: e.target.value })}>
                  {["low", "medium", "high"].map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Title">
              <Input value={itemForm.title} onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })} required />
            </Field>
            <Field label="Description">
              <Textarea value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Due at">
                <Input type="datetime-local" value={itemForm.dueAt} onChange={(e) => setItemForm({ ...itemForm, dueAt: e.target.value })} />
              </Field>
              <Field label="Scheduled for">
                <Input type="datetime-local" value={itemForm.scheduledFor} onChange={(e) => setItemForm({ ...itemForm, scheduledFor: e.target.value })} />
              </Field>
              <Field label="Recurring template">
                <Select value={itemForm.isRecurringTemplate} onChange={(e) => setItemForm({ ...itemForm, isRecurringTemplate: e.target.value })}>
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </Select>
              </Field>
              <Field label="Reminder required">
                <Select value={itemForm.reminderRequired} onChange={(e) => setItemForm({ ...itemForm, reminderRequired: e.target.value })}>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </Select>
              </Field>
            </div>
            <Button type="submit" disabled={submitting === "item"}>
              {submitting === "item" ? "Saving…" : "Create Item"}
            </Button>
          </form>
        </FormCard>

        {/* Create recurrence rule */}
        <FormCard
          badge="Recurrence"
          title="Create recurrence rule"
          description="Attach RRULE-like strings to existing life admin items."
        >
          <form
            className="space-y-4"
            onSubmit={(e) =>
              void (async () => {
                e.preventDefault();
                await runAction("recurrence", async () => {
                  await lifeAdminApi.createRecurrence({
                    item_id: Number(recurrenceForm.itemId),
                    recurrence_rule: recurrenceForm.recurrenceRule,
                    lead_time_days: Number(recurrenceForm.leadTimeDays),
                    next_due_at: toIsoString(recurrenceForm.nextDueAt),
                  });
                  setRecurrenceForm({ itemId: "", recurrenceRule: "", leadTimeDays: "3", nextDueAt: "" });
                });
              })()
            }
          >
            <Field label="Item">
              <Select value={recurrenceForm.itemId} onChange={(e) => setRecurrenceForm({ ...recurrenceForm, itemId: e.target.value })} required>
                <option value="">Select item</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </Select>
            </Field>
            <Field label="Recurrence rule">
              <Input
                value={recurrenceForm.recurrenceRule}
                onChange={(e) => setRecurrenceForm({ ...recurrenceForm, recurrenceRule: e.target.value })}
                placeholder="FREQ=MONTHLY;BYDAY=1MO"
                required
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Lead time days">
                <Input type="number" value={recurrenceForm.leadTimeDays} onChange={(e) => setRecurrenceForm({ ...recurrenceForm, leadTimeDays: e.target.value })} />
              </Field>
              <Field label="Next due at">
                <Input type="datetime-local" value={recurrenceForm.nextDueAt} onChange={(e) => setRecurrenceForm({ ...recurrenceForm, nextDueAt: e.target.value })} />
              </Field>
            </div>
            <Button type="submit" disabled={submitting === "recurrence"}>
              {submitting === "recurrence" ? "Saving…" : "Create Recurrence"}
            </Button>
          </form>
        </FormCard>

        {/* Recurrences table */}
        {recurrences.length > 0 && (
          <Table<LifeAdminRecurrence>
            data={recurrences}
            rowKey={(r) => r.id}
            columns={[
              {
                header: "Recurrence",
                render: (r) => (
                  <div className="space-y-1">
                    <p className="font-medium text-white">{r.recurrence_rule}</p>
                    <p className="text-xs text-slate-500">Item #{r.item_id}</p>
                  </div>
                ),
              },
              {
                header: "Lead Time",
                render: (r) => <p className="text-sm text-slate-300">{r.lead_time_days} days</p>,
              },
              {
                header: "Next Due",
                render: (r) => (
                  <div className="space-y-0.5">
                    <p className="text-sm text-slate-300">{formatDateTime(r.next_due_at)}</p>
                    <p className="text-xs text-slate-500">
                      Last gen {formatDateTime(r.last_generated_at)}
                    </p>
                  </div>
                ),
              },
            ]}
          />
        )}
      </AdvancedSection>
    </div>
  );
}
