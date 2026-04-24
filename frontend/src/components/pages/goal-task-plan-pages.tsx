"use client";

import { useState } from "react";

import { goalsApi, plansApi, tasksApi } from "@/lib/api";
import {
  compactObject,
  formatDateTime,
  formatNumber,
  titleCase,
  toDateTimeLocalValue,
  toIsoString,
  toOptionalNumber,
  toneFromPriority,
  toneFromStatus,
} from "@/lib/format";
import type {
  Goal,
  GoalCreate,
  GoalUpdate,
  Plan,
  PlanCreate,
  PlanUpdate,
  Task,
  TaskCreate,
  TaskUpdate,
} from "@/lib/types";
import { useApiQuery } from "@/hooks/use-api-query";
import { Field, FormCard } from "@/components/page-elements";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Input,
  LoadingState,
  Modal,
  SectionHeader,
  Select,
  StatCard,
  Table,
  Textarea,
} from "@/components/ui";

interface GoalFormState {
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  targetDate: string;
}

interface TaskFormState {
  title: string;
  description: string;
  goalId: string;
  status: string;
  priority: string;
  dueAt: string;
  scheduledFor: string;
  estimatedMinutes: string;
  isRecurring: string;
  recurrenceRule: string;
  reminderOffsetMinutes: string;
}

interface PlanFormState {
  planType: string;
  title: string;
  content: string;
  startAt: string;
  endAt: string;
  status: string;
  adherenceStatus: string;
}

const DEFAULT_GOAL_FORM: GoalFormState = {
  title: "",
  description: "",
  category: "",
  status: "active",
  priority: "medium",
  targetDate: "",
};

const DEFAULT_TASK_FORM: TaskFormState = {
  title: "",
  description: "",
  goalId: "",
  status: "pending",
  priority: "medium",
  dueAt: "",
  scheduledFor: "",
  estimatedMinutes: "",
  isRecurring: "false",
  recurrenceRule: "",
  reminderOffsetMinutes: "",
};

const DEFAULT_PLAN_FORM: PlanFormState = {
  planType: "daily",
  title: "",
  content: "",
  startAt: "",
  endAt: "",
  status: "draft",
  adherenceStatus: "",
};

function mapGoalToForm(goal: Goal): GoalFormState {
  return {
    title: goal.title,
    description: goal.description ?? "",
    category: goal.category ?? "",
    status: goal.status,
    priority: goal.priority,
    targetDate: toDateTimeLocalValue(goal.target_date),
  };
}

async function loadTasksPageData() {
  const [tasks, goals] = await Promise.all([tasksApi.list(), goalsApi.list()]);
  return { tasks, goals };
}

function mapTaskToForm(task: Task): TaskFormState {
  return {
    title: task.title,
    description: task.description ?? "",
    goalId: task.goal_id ? String(task.goal_id) : "",
    status: task.status,
    priority: task.priority,
    dueAt: toDateTimeLocalValue(task.due_at),
    scheduledFor: toDateTimeLocalValue(task.scheduled_for),
    estimatedMinutes: task.estimated_minutes ? String(task.estimated_minutes) : "",
    isRecurring: task.is_recurring ? "true" : "false",
    recurrenceRule: task.recurrence_rule ?? "",
    reminderOffsetMinutes: task.reminder_offset_minutes
      ? String(task.reminder_offset_minutes)
      : "",
  };
}

function mapPlanToForm(plan: Plan): PlanFormState {
  return {
    planType: plan.plan_type,
    title: plan.title,
    content: plan.content ?? "",
    startAt: toDateTimeLocalValue(plan.start_at),
    endAt: toDateTimeLocalValue(plan.end_at),
    status: plan.status,
    adherenceStatus: plan.adherence_status ?? "",
  };
}

function GoalForm({
  form,
  onChange,
  onSubmit,
  submitting,
}: {
  form: GoalFormState;
  onChange: (next: GoalFormState) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  submitting: boolean;
}) {
  return (
    <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
      <Field label="Title">
        <Input
          value={form.title}
          onChange={(event) => onChange({ ...form, title: event.target.value })}
          required
        />
      </Field>
      <Field label="Description">
        <Textarea
          value={form.description}
          onChange={(event) => onChange({ ...form, description: event.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <Input
            value={form.category}
            onChange={(event) => onChange({ ...form, category: event.target.value })}
          />
        </Field>
        <Field label="Target date">
          <Input
            type="datetime-local"
            value={form.targetDate}
            onChange={(event) => onChange({ ...form, targetDate: event.target.value })}
          />
        </Field>
        <Field label="Status">
          <Select
            value={form.status}
            onChange={(event) => onChange({ ...form, status: event.target.value })}
          >
            {["active", "paused", "completed", "archived"].map((option) => (
              <option key={option} value={option}>
                {titleCase(option)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priority">
          <Select
            value={form.priority}
            onChange={(event) => onChange({ ...form, priority: event.target.value })}
          >
            {["low", "medium", "high"].map((option) => (
              <option key={option} value={option}>
                {titleCase(option)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Button className="w-full sm:w-auto" type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Save goal"}
      </Button>
    </form>
  );
}

function TaskForm({
  form,
  goals,
  onChange,
  onSubmit,
  submitting,
}: {
  form: TaskFormState;
  goals: Goal[];
  onChange: (next: TaskFormState) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  submitting: boolean;
}) {
  return (
    <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <Input
            value={form.title}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
            required
          />
        </Field>
        <Field label="Goal link">
          <Select
            value={form.goalId}
            onChange={(event) => onChange({ ...form, goalId: event.target.value })}
          >
            <option value="">No goal</option>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Description">
        <Textarea
          value={form.description}
          onChange={(event) => onChange({ ...form, description: event.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status">
          <Select
            value={form.status}
            onChange={(event) => onChange({ ...form, status: event.target.value })}
          >
            {["pending", "in_progress", "completed", "blocked"].map((option) => (
              <option key={option} value={option}>
                {titleCase(option)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priority">
          <Select
            value={form.priority}
            onChange={(event) => onChange({ ...form, priority: event.target.value })}
          >
            {["low", "medium", "high"].map((option) => (
              <option key={option} value={option}>
                {titleCase(option)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Due at">
          <Input
            type="datetime-local"
            value={form.dueAt}
            onChange={(event) => onChange({ ...form, dueAt: event.target.value })}
          />
        </Field>
        <Field label="Scheduled for">
          <Input
            type="datetime-local"
            value={form.scheduledFor}
            onChange={(event) => onChange({ ...form, scheduledFor: event.target.value })}
          />
        </Field>
        <Field label="Estimated minutes">
          <Input
            type="number"
            value={form.estimatedMinutes}
            onChange={(event) =>
              onChange({ ...form, estimatedMinutes: event.target.value })
            }
          />
        </Field>
        <Field label="Recurring">
          <Select
            value={form.isRecurring}
            onChange={(event) => onChange({ ...form, isRecurring: event.target.value })}
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </Select>
        </Field>
        <Field label="Recurrence rule">
          <Input
            value={form.recurrenceRule}
            onChange={(event) =>
              onChange({ ...form, recurrenceRule: event.target.value })
            }
            placeholder="RRULE:FREQ=WEEKLY"
          />
        </Field>
        <Field label="Reminder offset">
          <Input
            type="number"
            value={form.reminderOffsetMinutes}
            onChange={(event) =>
              onChange({ ...form, reminderOffsetMinutes: event.target.value })
            }
            placeholder="30"
          />
        </Field>
      </div>
      <Button className="w-full sm:w-auto" type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Save task"}
      </Button>
    </form>
  );
}

function PlanForm({
  form,
  onChange,
  onSubmit,
  submitting,
}: {
  form: PlanFormState;
  onChange: (next: PlanFormState) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  submitting: boolean;
}) {
  return (
    <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <Input
            value={form.title}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
            required
          />
        </Field>
        <Field label="Plan type">
          <Select
            value={form.planType}
            onChange={(event) => onChange({ ...form, planType: event.target.value })}
          >
            {["daily", "weekly", "sprint"].map((option) => (
              <option key={option} value={option}>
                {titleCase(option)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Content">
        <Textarea
          value={form.content}
          onChange={(event) => onChange({ ...form, content: event.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Start at">
          <Input
            type="datetime-local"
            value={form.startAt}
            onChange={(event) => onChange({ ...form, startAt: event.target.value })}
          />
        </Field>
        <Field label="End at">
          <Input
            type="datetime-local"
            value={form.endAt}
            onChange={(event) => onChange({ ...form, endAt: event.target.value })}
          />
        </Field>
        <Field label="Status">
          <Select
            value={form.status}
            onChange={(event) => onChange({ ...form, status: event.target.value })}
          >
            {["draft", "active", "completed", "archived"].map((option) => (
              <option key={option} value={option}>
                {titleCase(option)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Adherence status">
          <Input
            value={form.adherenceStatus}
            onChange={(event) =>
              onChange({ ...form, adherenceStatus: event.target.value })
            }
            placeholder="completed, partial, missed"
          />
        </Field>
      </div>
      <Button className="w-full sm:w-auto" type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Save plan"}
      </Button>
    </form>
  );
}

export function GoalsPage() {
  const { data, error, loading, reload } = useApiQuery(goalsApi.list);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [form, setForm] = useState<GoalFormState>(DEFAULT_GOAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const openCreate = () => {
    setEditingGoal(null);
    setForm(DEFAULT_GOAL_FORM);
    setModalOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setForm(mapGoalToForm(goal));
    setModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    const payload = compactObject({
      title: form.title,
      description: form.description,
      category: form.category,
      status: form.status,
      priority: form.priority,
      target_date: toIsoString(form.targetDate),
    });

    try {
      if (editingGoal) {
        await goalsApi.update(editingGoal.id, payload as GoalUpdate);
      } else {
        await goalsApi.create(payload as GoalCreate);
      }

      setModalOpen(false);
      await reload();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (goalId: number) => {
    if (!window.confirm("Delete this goal?")) {
      return;
    }

    await goalsApi.remove(goalId);
    await reload();
  };

  if (loading && !data) {
    return <LoadingState title="Loading goals" description="Fetching goal records." />;
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Execution Foundation"
        title="Goals"
        description="Track high-level outcomes, categories, target dates, and status."
        actions={
          <>
            <Button variant="secondary" onClick={() => void reload()}>
              Refresh
            </Button>
            <Button onClick={openCreate}>New Goal</Button>
          </>
        }
      />

      {error ? <ErrorState description={error} /> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Goal Count"
          value={formatNumber(data?.length)}
          hint="Total goals in the system"
        />
        <StatCard
          label="Active Goals"
          value={formatNumber(data?.filter((goal) => goal.status === "active").length)}
          hint="Currently open goals"
          tone="success"
        />
        <StatCard
          label="Completed Goals"
          value={formatNumber(data?.filter((goal) => goal.status === "completed").length)}
          hint="Goals marked complete"
          tone="warning"
        />
      </div>

      <Table<Goal>
        data={data ?? []}
        rowKey={(goal) => goal.id}
        columns={[
          {
            header: "Goal",
            render: (goal) => (
              <div className="space-y-2">
                <p className="font-medium text-white">{goal.title}</p>
                {goal.description ? (
                  <p className="text-sm leading-6 text-slate-400">{goal.description}</p>
                ) : null}
              </div>
            ),
          },
          {
            header: "Meta",
            render: (goal) => (
              <div className="flex flex-wrap gap-2">
                {goal.category ? <Badge>{goal.category}</Badge> : null}
                <Badge tone={toneFromPriority(goal.priority)}>{goal.priority}</Badge>
                <Badge tone={toneFromStatus(goal.status)}>{goal.status}</Badge>
              </div>
            ),
          },
          {
            header: "Target",
            render: (goal) => (
              <div className="space-y-1 text-sm text-slate-300">
                <p>{formatDateTime(goal.target_date)}</p>
                <p className="text-xs text-slate-500">
                  Updated {formatDateTime(goal.updated_at)}
                </p>
              </div>
            ),
          },
          {
            header: "Actions",
            render: (goal) => (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => openEdit(goal)}>
                  Edit
                </Button>
                <Button size="sm" variant="danger" onClick={() => void handleDelete(goal.id)}>
                  Delete
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={modalOpen}
        title={editingGoal ? "Edit goal" : "Create goal"}
        description="Persisted directly to the backend goals endpoints."
        onClose={() => setModalOpen(false)}
      >
        <GoalForm form={form} onChange={setForm} onSubmit={handleSubmit} submitting={submitting} />
      </Modal>
    </div>
  );
}

export function TasksPage() {
  const { data, error, loading, reload } = useApiQuery(loadTasksPageData);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskFormState>(DEFAULT_TASK_FORM);
  const [submitting, setSubmitting] = useState(false);

  const openCreate = () => {
    setEditingTask(null);
    setForm(DEFAULT_TASK_FORM);
    setModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setForm(mapTaskToForm(task));
    setModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    const payload = compactObject({
      title: form.title,
      description: form.description,
      goal_id: form.goalId ? Number(form.goalId) : undefined,
      status: form.status,
      priority: form.priority,
      due_at: toIsoString(form.dueAt),
      scheduled_for: toIsoString(form.scheduledFor),
      estimated_minutes: toOptionalNumber(form.estimatedMinutes),
      is_recurring: form.isRecurring === "true",
      recurrence_rule: form.recurrenceRule,
      reminder_offset_minutes: toOptionalNumber(form.reminderOffsetMinutes),
    });

    try {
      if (editingTask) {
        await tasksApi.update(editingTask.id, payload as TaskUpdate);
      } else {
        await tasksApi.create(payload as TaskCreate);
      }

      setModalOpen(false);
      await reload();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (taskId: number) => {
    if (!window.confirm("Delete this task?")) {
      return;
    }

    await tasksApi.remove(taskId);
    await reload();
  };

  if (loading && !data) {
    return <LoadingState title="Loading tasks" description="Reading execution queue items." />;
  }

  const tasks = data?.tasks ?? [];
  const goals = data?.goals ?? [];

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Execution Queue"
        title="Tasks"
        description="Manage task status, scheduling windows, recurrence, and reminders."
        actions={
          <>
            <Button variant="secondary" onClick={() => void reload()}>
              Refresh
            </Button>
            <Button onClick={openCreate}>New Task</Button>
          </>
        }
      />

      {error ? <ErrorState description={error} /> : null}

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Task Count" value={formatNumber(tasks.length)} hint="All task records" />
        <StatCard
          label="In Progress"
          value={formatNumber(tasks.filter((task) => task.status === "in_progress").length)}
          hint="Currently active work"
          tone="warning"
        />
        <StatCard
          label="Completed"
          value={formatNumber(tasks.filter((task) => task.status === "completed").length)}
          hint="Finished tasks"
          tone="success"
        />
        <StatCard
          label="Recurring"
          value={formatNumber(tasks.filter((task) => task.is_recurring).length)}
          hint="Tasks with recurrence enabled"
        />
      </div>

      <Table<Task>
        data={tasks}
        rowKey={(task) => task.id}
        columns={[
          {
            header: "Task",
            render: (task) => {
              const linkedGoal = goals.find((goal) => goal.id === task.goal_id);
              return (
                <div className="space-y-2">
                  <p className="font-medium text-white">{task.title}</p>
                  {task.description ? (
                    <p className="text-sm leading-6 text-slate-400">{task.description}</p>
                  ) : null}
                  {linkedGoal ? <Badge>{linkedGoal.title}</Badge> : null}
                </div>
              );
            },
          },
          {
            header: "Schedule",
            render: (task) => (
              <div className="space-y-1 text-sm text-slate-300">
                <p>Due {formatDateTime(task.due_at)}</p>
                <p className="text-xs text-slate-500">
                  Scheduled {formatDateTime(task.scheduled_for)}
                </p>
                <p className="text-xs text-slate-500">
                  {task.estimated_minutes ? `${task.estimated_minutes} min` : "No estimate"}
                </p>
              </div>
            ),
          },
          {
            header: "Meta",
            render: (task) => (
              <div className="flex flex-wrap gap-2">
                <Badge tone={toneFromPriority(task.priority)}>{task.priority}</Badge>
                <Badge tone={toneFromStatus(task.status)}>{task.status}</Badge>
                {task.is_recurring ? <Badge>Recurring</Badge> : null}
              </div>
            ),
          },
          {
            header: "Actions",
            render: (task) => (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => openEdit(task)}>
                  Edit
                </Button>
                <Button size="sm" variant="danger" onClick={() => void handleDelete(task.id)}>
                  Delete
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={modalOpen}
        title={editingTask ? "Edit task" : "Create task"}
        description="Write directly to the backend task routes."
        onClose={() => setModalOpen(false)}
      >
        <TaskForm
          form={form}
          goals={goals}
          onChange={setForm}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </Modal>
    </div>
  );
}

export function PlansPage() {
  const { data, error, loading, reload } = useApiQuery(plansApi.list);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanFormState>(DEFAULT_PLAN_FORM);
  const [submitting, setSubmitting] = useState(false);

  const openCreate = () => {
    setEditingPlan(null);
    setForm(DEFAULT_PLAN_FORM);
    setModalOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setForm(mapPlanToForm(plan));
    setModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    const payload = compactObject({
      plan_type: form.planType,
      title: form.title,
      content: form.content,
      start_at: toIsoString(form.startAt),
      end_at: toIsoString(form.endAt),
      status: form.status,
      adherence_status: form.adherenceStatus,
    });

    try {
      if (editingPlan) {
        await plansApi.update(editingPlan.id, payload as PlanUpdate);
      } else {
        await plansApi.create(payload as PlanCreate);
      }

      setModalOpen(false);
      await reload();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (planId: number) => {
    if (!window.confirm("Delete this plan?")) {
      return;
    }

    await plansApi.remove(planId);
    await reload();
  };

  if (loading && !data) {
    return <LoadingState title="Loading plans" description="Fetching structured plan records." />;
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Plan Records"
        title="Plans"
        description="Daily and weekly plans stored by the backend planning domain."
        actions={
          <>
            <Button variant="secondary" onClick={() => void reload()}>
              Refresh
            </Button>
            <Button onClick={openCreate}>New Plan</Button>
          </>
        }
      />

      {error ? <ErrorState description={error} /> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Plan Count" value={formatNumber(data?.length)} hint="Stored plan records" />
        <StatCard
          label="Draft Plans"
          value={formatNumber(data?.filter((plan) => plan.status === "draft").length)}
          hint="Not yet active"
        />
        <StatCard
          label="Completed Plans"
          value={formatNumber(data?.filter((plan) => plan.status === "completed").length)}
          hint="Plans completed"
          tone="success"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <FormCard
          title="Planning notes"
          description="Use plans for daily, weekly, or sprint structures tied to start and end windows."
          badge="API-backed"
        >
          <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
            <Card className="bg-white/5 p-4">
              <p className="font-medium text-white">Use cases</p>
              <p className="mt-2 leading-6 text-slate-400">
                Daily execution plans, weekly outlines, and lightweight sprint structures.
              </p>
            </Card>
            <Card className="bg-white/5 p-4">
              <p className="font-medium text-white">Supported fields</p>
              <p className="mt-2 leading-6 text-slate-400">
                Plan type, content, start and end windows, status, and adherence markers.
              </p>
            </Card>
          </div>
        </FormCard>

        <Table<Plan>
          data={data ?? []}
          rowKey={(plan) => plan.id}
          columns={[
            {
              header: "Plan",
              render: (plan) => (
                <div className="space-y-2">
                  <p className="font-medium text-white">{plan.title}</p>
                  {plan.content ? (
                    <p className="text-sm leading-6 text-slate-400">{plan.content}</p>
                  ) : null}
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
              header: "Meta",
              render: (plan) => (
                <div className="flex flex-wrap gap-2">
                  <Badge>{plan.plan_type}</Badge>
                  <Badge tone={toneFromStatus(plan.status)}>{plan.status}</Badge>
                  {plan.adherence_status ? (
                    <Badge tone={toneFromStatus(plan.adherence_status)}>
                      {plan.adherence_status}
                    </Badge>
                  ) : null}
                </div>
              ),
            },
            {
              header: "Actions",
              render: (plan) => (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(plan)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => void handleDelete(plan.id)}>
                    Delete
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </div>

      <Modal
        open={modalOpen}
        title={editingPlan ? "Edit plan" : "Create plan"}
        description="Create a persisted plan without changing backend behavior."
        onClose={() => setModalOpen(false)}
      >
        <PlanForm form={form} onChange={setForm} onSubmit={handleSubmit} submitting={submitting} />
      </Modal>
    </div>
  );
}
