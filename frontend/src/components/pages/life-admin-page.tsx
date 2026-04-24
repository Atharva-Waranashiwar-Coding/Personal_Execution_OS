"use client";

import { useMemo, useState } from "react";

import { lifeAdminApi } from "@/lib/api";
import { formatDateTime, formatNumber, safeJsonParse, toIsoString, toneFromPriority, toneFromStatus } from "@/lib/format";
import type { LifeAdminCapture, LifeAdminItem, LifeAdminRecurrence } from "@/lib/types";
import { useApiQuery } from "@/hooks/use-api-query";
import { Field, FormCard, KeyValueList } from "@/components/page-elements";
import {
  Badge,
  Button,
  Card,
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
    itemType: "bill",
    title: "",
    description: "",
    status: "pending",
    priority: "medium",
    dueAt: "",
    scheduledFor: "",
    isRecurringTemplate: "false",
    reminderRequired: "true",
    source: "manual",
  });
  const [captureText, setCaptureText] = useState("");
  const [recurrenceForm, setRecurrenceForm] = useState({
    itemId: "",
    recurrenceRule: "",
    leadTimeDays: "3",
    nextDueAt: "",
  });
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [lastCapture, setLastCapture] = useState<LifeAdminCapture | null>(null);
  const [lastReminderMessage, setLastReminderMessage] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const items = data?.items ?? EMPTY_ITEMS;
  const recurrences = data?.recurrences ?? EMPTY_RECURRENCES;

  const derivedInsights = useMemo(() => {
    const urgentItems = items.filter((item) => {
      if (!item.due_at || item.status === "completed") {
        return false;
      }

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
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Life Admin Agent"
        title="Life Admin"
        description="Track admin items, capture natural language tasks, generate recurrences, escalate overdue work, and manage reminder flows."
        actions={
          <>
            <Button variant="secondary" onClick={() => void reload()}>
              Refresh
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                void runAction("generate", async () => {
                  await lifeAdminApi.generateRecurrences();
                })
              }
              disabled={submitting === "generate"}
            >
              {submitting === "generate" ? "Generating..." : "Generate Recurrences"}
            </Button>
            <Button
              onClick={() =>
                void runAction("escalate", async () => {
                  await lifeAdminApi.escalate();
                })
              }
              disabled={submitting === "escalate"}
            >
              {submitting === "escalate" ? "Escalating..." : "Escalate Items"}
            </Button>
          </>
        }
      />

      {error ? <ErrorState description={error} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending Items"
          value={formatNumber(derivedInsights.pending)}
          hint="Admin work still open"
        />
        <StatCard
          label="Urgent Window"
          value={formatNumber(derivedInsights.urgent)}
          hint="Due in the next three days"
          tone="danger"
        />
        <StatCard
          label="Escalated Items"
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

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <FormCard
          badge="Manual entry"
          title="Create life admin item"
          description="Persist structured items directly when you already know the type and date."
        >
          <form
            className="space-y-4"
            onSubmit={(event) =>
              void (async () => {
                event.preventDefault();
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
                    itemType: "bill",
                    title: "",
                    description: "",
                    status: "pending",
                    priority: "medium",
                    dueAt: "",
                    scheduledFor: "",
                    isRecurringTemplate: "false",
                    reminderRequired: "true",
                    source: "manual",
                  });
                });
              })()
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Item type">
                <Select
                  value={itemForm.itemType}
                  onChange={(event) =>
                    setItemForm({ ...itemForm, itemType: event.target.value })
                  }
                >
                  {["bill", "errand", "renewal", "appointment", "household"].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Source">
                <Input
                  value={itemForm.source}
                  onChange={(event) =>
                    setItemForm({ ...itemForm, source: event.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Title">
              <Input
                value={itemForm.title}
                onChange={(event) =>
                  setItemForm({ ...itemForm, title: event.target.value })
                }
                required
              />
            </Field>
            <Field label="Description">
              <Textarea
                value={itemForm.description}
                onChange={(event) =>
                  setItemForm({ ...itemForm, description: event.target.value })
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Status">
                <Select
                  value={itemForm.status}
                  onChange={(event) =>
                    setItemForm({ ...itemForm, status: event.target.value })
                  }
                >
                  {["pending", "scheduled", "completed", "cancelled"].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Priority">
                <Select
                  value={itemForm.priority}
                  onChange={(event) =>
                    setItemForm({ ...itemForm, priority: event.target.value })
                  }
                >
                  {["low", "medium", "high"].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Due at">
                <Input
                  type="datetime-local"
                  value={itemForm.dueAt}
                  onChange={(event) =>
                    setItemForm({ ...itemForm, dueAt: event.target.value })
                  }
                />
              </Field>
              <Field label="Scheduled for">
                <Input
                  type="datetime-local"
                  value={itemForm.scheduledFor}
                  onChange={(event) =>
                    setItemForm({ ...itemForm, scheduledFor: event.target.value })
                  }
                />
              </Field>
              <Field label="Recurring template">
                <Select
                  value={itemForm.isRecurringTemplate}
                  onChange={(event) =>
                    setItemForm({
                      ...itemForm,
                      isRecurringTemplate: event.target.value,
                    })
                  }
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </Select>
              </Field>
              <Field label="Reminder required">
                <Select
                  value={itemForm.reminderRequired}
                  onChange={(event) =>
                    setItemForm({
                      ...itemForm,
                      reminderRequired: event.target.value,
                    })
                  }
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </Select>
              </Field>
            </div>
            <Button type="submit" disabled={submitting === "item"}>
              {submitting === "item" ? "Saving..." : "Create Item"}
            </Button>
          </form>
        </FormCard>

        <FormCard
          badge="Natural language"
          title="Capture admin task"
          description="Send raw language to the capture route and store the parsed payload for review."
        >
          <form
            className="space-y-4"
            onSubmit={(event) =>
              void (async () => {
                event.preventDefault();
                await runAction("capture", async () => {
                  const capture = await lifeAdminApi.capture({ raw_text: captureText });
                  setLastCapture(capture);
                  setCaptureText("");
                });
              })()
            }
          >
            <Field label="Raw text">
              <Textarea
                value={captureText}
                onChange={(event) => setCaptureText(event.target.value)}
                placeholder="Pay the electric bill next Tuesday and remind me two days before."
                required
              />
            </Field>
            <Button type="submit" disabled={submitting === "capture"}>
              {submitting === "capture" ? "Capturing..." : "Capture Item"}
            </Button>
          </form>

          {lastCapture ? (
            <div className="space-y-4">
              <KeyValueList
                items={[
                  { label: "Capture status", value: lastCapture.status },
                  { label: "Raw text", value: lastCapture.raw_text },
                ]}
              />
              <JsonPreview
                title="Normalized capture payload"
                value={safeJsonParse(lastCapture.normalized_payload)}
              />
            </div>
          ) : null}
        </FormCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <FormCard
          badge="Recurrence"
          title="Create recurrence rule"
          description="Attach RRULE-like strings to existing life admin items."
        >
          <form
            className="space-y-4"
            onSubmit={(event) =>
              void (async () => {
                event.preventDefault();
                await runAction("recurrence", async () => {
                  await lifeAdminApi.createRecurrence({
                    item_id: Number(recurrenceForm.itemId),
                    recurrence_rule: recurrenceForm.recurrenceRule,
                    lead_time_days: Number(recurrenceForm.leadTimeDays),
                    next_due_at: toIsoString(recurrenceForm.nextDueAt),
                  });
                  setRecurrenceForm({
                    itemId: "",
                    recurrenceRule: "",
                    leadTimeDays: "3",
                    nextDueAt: "",
                  });
                });
              })()
            }
          >
            <Field label="Item">
              <Select
                value={recurrenceForm.itemId}
                onChange={(event) =>
                  setRecurrenceForm({ ...recurrenceForm, itemId: event.target.value })
                }
                required
              >
                <option value="">Select item</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Recurrence rule">
              <Input
                value={recurrenceForm.recurrenceRule}
                onChange={(event) =>
                  setRecurrenceForm({
                    ...recurrenceForm,
                    recurrenceRule: event.target.value,
                  })
                }
                placeholder="FREQ=MONTHLY;BYDAY=1MO"
                required
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Lead time days">
                <Input
                  type="number"
                  value={recurrenceForm.leadTimeDays}
                  onChange={(event) =>
                    setRecurrenceForm({
                      ...recurrenceForm,
                      leadTimeDays: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Next due at">
                <Input
                  type="datetime-local"
                  value={recurrenceForm.nextDueAt}
                  onChange={(event) =>
                    setRecurrenceForm({
                      ...recurrenceForm,
                      nextDueAt: event.target.value,
                    })
                  }
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={submitting === "recurrence"}>
                {submitting === "recurrence" ? "Saving..." : "Create Recurrence"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={submitting === "schedule"}
                onClick={() =>
                  void runAction("schedule", async () => {
                    const response = await lifeAdminApi.scheduleReminders();
                    setLastReminderMessage(`Scheduled ${response.created_count} reminders.`);
                  })
                }
              >
                {submitting === "schedule" ? "Scheduling..." : "Schedule Reminders"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={submitting === "send"}
                onClick={() =>
                  void runAction("send", async () => {
                    const response = await lifeAdminApi.sendReminders();
                    setLastReminderMessage(`Sent ${response.sent_count} reminders.`);
                  })
                }
              >
                {submitting === "send" ? "Sending..." : "Send Due Reminders"}
              </Button>
            </div>
            {lastReminderMessage ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                {lastReminderMessage}
              </div>
            ) : null}
          </form>
        </FormCard>

        {
          // TODO(frontend): Replace this derived placeholder when the backend /life-admin/insights route is enabled.
        }
        <Card className="space-y-4 border-dashed border-white/12 bg-white/4">
          <div>
            <h3 className="text-lg font-medium text-white">Insights Placeholder</h3>
            <p className="text-sm leading-6 text-slate-400">
              The backend currently does not expose `/life-admin/insights`. This panel stays
              intentionally placeholder-only until that route is implemented.
            </p>
          </div>
          <KeyValueList
            items={[
              { label: "Client-derived pending count", value: formatNumber(derivedInsights.pending) },
              { label: "Client-derived urgent count", value: formatNumber(derivedInsights.urgent) },
              { label: "Client-derived escalated count", value: formatNumber(derivedInsights.escalated) },
              { label: "Tracked recurrences", value: formatNumber(recurrences.length) },
            ]}
          />
        </Card>
      </div>

      <Table<LifeAdminItem>
        data={items}
        rowKey={(item) => item.id}
        columns={[
          {
            header: "Item",
            render: (item) => (
              <div className="space-y-2">
                <p className="font-medium text-white">{item.title}</p>
                {item.description ? (
                  <p className="text-sm leading-6 text-slate-400">{item.description}</p>
                ) : null}
              </div>
            ),
          },
          {
            header: "Meta",
            render: (item) => (
              <div className="flex flex-wrap gap-2">
                <Badge>{item.item_type}</Badge>
                <Badge tone={toneFromPriority(item.priority)}>{item.priority}</Badge>
                <Badge tone={toneFromStatus(item.status)}>{item.status}</Badge>
                {item.escalation_level > 0 ? (
                  <Badge tone="danger">Escalation {item.escalation_level}</Badge>
                ) : null}
              </div>
            ),
          },
          {
            header: "Schedule",
            render: (item) => (
              <div className="space-y-1 text-sm text-slate-300">
                <p>Due {formatDateTime(item.due_at)}</p>
                <p className="text-xs text-slate-500">
                  Scheduled {formatDateTime(item.scheduled_for)}
                </p>
              </div>
            ),
          },
        ]}
      />

      <Table<LifeAdminRecurrence>
        data={recurrences}
        rowKey={(recurrence) => recurrence.id}
        columns={[
          {
            header: "Recurrence",
            render: (recurrence) => (
              <div className="space-y-2">
                <p className="font-medium text-white">{recurrence.recurrence_rule}</p>
                <p className="text-xs text-slate-500">Item #{recurrence.item_id}</p>
              </div>
            ),
          },
          {
            header: "Lead Time",
            render: (recurrence) => (
              <p className="text-sm text-slate-300">{recurrence.lead_time_days} days</p>
            ),
          },
          {
            header: "Next Due",
            render: (recurrence) => (
              <div className="space-y-1 text-sm text-slate-300">
                <p>{formatDateTime(recurrence.next_due_at)}</p>
                <p className="text-xs text-slate-500">
                  Last generated {formatDateTime(recurrence.last_generated_at)}
                </p>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
