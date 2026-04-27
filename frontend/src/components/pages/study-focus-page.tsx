"use client";

import { useMemo, useState } from "react";

import { studyApi } from "@/lib/api";
import {
  formatDateTime,
  formatNumber,
  toIsoString,
  toneFromPriority,
  toneFromStatus,
} from "@/lib/format";
import { settledValue } from "@/lib/request";
import type {
  InterviewTrack,
  StudyInsightResponse,
  StudySession,
  StudySubtopic,
  StudyTopic,
} from "@/lib/types";
import { useApiQuery } from "@/hooks/use-api-query";
import { Field, FormCard } from "@/components/page-elements";
import { AICommandBox } from "@/components/ai/AICommandBox";
import {
  AdvancedSection,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  SectionHeader,
  Select,
  StatCard,
  Table,
  Textarea,
} from "@/components/ui";

interface StudyData {
  tracks: InterviewTrack[];
  topics: StudyTopic[];
  subtopics: StudySubtopic[];
  sessions: StudySession[];
  insights: StudyInsightResponse | null;
}

async function loadStudyData(): Promise<StudyData> {
  const results = await Promise.allSettled([
    studyApi.listTracks(),
    studyApi.listTopics(),
    studyApi.listSubtopics(),
    studyApi.listSessions(),
    studyApi.insights(),
  ]);

  return {
    tracks: settledValue(results[0], []),
    topics: settledValue(results[1], []),
    subtopics: settledValue(results[2], []),
    sessions: settledValue(results[3], []),
    insights: settledValue(results[4], null),
  };
}

const STUDY_EXAMPLES = [
  "I have a system design interview in 3 weeks. Create a study plan.",
  "Generate 3 sessions for dynamic programming this week.",
  "Mark all overdue sessions as recovered and reschedule them.",
];

export function StudyFocusPage() {
  const { data, error, loading, reload } = useApiQuery(loadStudyData);
  const [trackForm, setTrackForm] = useState({
    name: "",
    description: "",
    targetRole: "",
    targetCompany: "",
    status: "active",
  });
  const [topicForm, setTopicForm] = useState({
    interviewTrackId: "",
    name: "",
    description: "",
    difficulty: "medium",
    status: "not_started",
    backlogSize: "0",
    priorityWeight: "5",
    deadlineAt: "",
    estimatedTotalMinutes: "",
  });
  const [subtopicForm, setSubtopicForm] = useState({
    topicId: "",
    name: "",
    description: "",
    difficulty: "medium",
    status: "not_started",
    estimatedMinutes: "",
    isHighPriority: "false",
    deadlineAt: "",
  });
  const [sessionForm, setSessionForm] = useState({
    topicId: "",
    subtopicId: "",
    title: "",
    description: "",
    scheduledStartAt: "",
    scheduledEndAt: "",
    plannedMinutes: "60",
    energyPreference: "medium",
    sessionType: "deep_work",
  });
  const [generationForm, setGenerationForm] = useState({
    energyPreference: "medium",
    availableHours: "3",
  });
  const [submitting, setSubmitting] = useState<string | null>(null);

  const runAction = async (name: string, action: () => Promise<void>) => {
    setSubmitting(name);
    try {
      await action();
      await reload();
    } finally {
      setSubmitting(null);
    }
  };

  const studyData = data ?? {
    tracks: [],
    topics: [],
    subtopics: [],
    sessions: [],
    insights: null,
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const { todaySessions, upcomingSessions } = useMemo(() => {
    const pending = studyData.sessions.filter((s) => s.status !== "completed");
    const sorted = [...pending].sort(
      (a, b) =>
        new Date(a.scheduled_start_at).getTime() - new Date(b.scheduled_start_at).getTime(),
    );
    return {
      todaySessions: sorted.filter((s) => s.scheduled_start_at.startsWith(todayStr)),
      upcomingSessions: sorted.filter((s) => !s.scheduled_start_at.startsWith(todayStr)).slice(0, 5),
    };
  }, [studyData.sessions, todayStr]);

  const activeTopics = useMemo(
    () => studyData.topics.filter((t) => t.status !== "completed"),
    [studyData.topics],
  );

  if (loading && !data) {
    return (
      <LoadingState
        title="Loading study focus"
        description="Collecting tracks, topics, sessions, and insights."
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Study Agent"
        title="Study Focus"
        description="Tell the AI to plan, generate, or adjust your study schedule. Complete sessions as you go."
        actions={
          <Button variant="secondary" size="sm" onClick={() => void reload()}>
            Refresh
          </Button>
        }
      />

      {error ? <ErrorState description={error} /> : null}

      {/* AI Command */}
      <AICommandBox
        placeholder="I have a system design interview in 3 weeks. Create a study plan."
        examples={STUDY_EXAMPLES}
        onComplete={() => void reload()}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current Streak"
          value={formatNumber(studyData.insights?.current_streak_days)}
          hint="Consecutive study days"
          tone="success"
        />
        <StatCard
          label="Pending Sessions"
          value={formatNumber(studyData.insights?.pending_sessions)}
          hint="Sessions left to complete"
          tone="warning"
        />
        <StatCard
          label="Missed Sessions"
          value={formatNumber(studyData.insights?.missed_sessions)}
          hint="Need recovery"
          tone="danger"
        />
        <StatCard
          label="Weekly Coverage"
          value={formatNumber(studyData.insights?.estimated_weekly_coverage_minutes)}
          hint="Est. minutes this week"
        />
      </div>

      {/* Today's sessions */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-300">{"Today's Sessions"}</h3>
        {todaySessions.length === 0 ? (
          <EmptyState
            title="Nothing scheduled for today"
            description="Ask the AI to generate sessions for today, or check upcoming sessions below."
          />
        ) : (
          <div className="grid gap-3">
            {todaySessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                submitting={submitting}
                onComplete={(id, mins) =>
                  void runAction(`complete-${id}`, async () => {
                    await studyApi.completeSession(id, mins);
                  })
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming sessions */}
      {upcomingSessions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">Upcoming Sessions</h3>
          <div className="grid gap-3">
            {upcomingSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                submitting={submitting}
                onComplete={(id, mins) =>
                  void runAction(`complete-${id}`, async () => {
                    await studyApi.completeSession(id, mins);
                  })
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Active topics */}
      {activeTopics.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">Topic Progress</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {activeTopics.map((topic) => {
              const total = topic.estimated_total_minutes ?? 0;
              const done = topic.completed_minutes ?? 0;
              const pct = total > 0 ? Math.min(Math.round((done / total) * 100), 100) : 0;
              return (
                <div
                  key={topic.id}
                  className="rounded-2xl border border-white/8 bg-slate-950/60 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-white">{topic.name}</p>
                      {topic.description && (
                        <p className="mt-0.5 text-xs text-slate-500">{topic.description}</p>
                      )}
                    </div>
                    <Badge tone={toneFromStatus(topic.status)}>{topic.status}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{done} min done</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/6">
                      <div
                        className="h-1.5 rounded-full bg-linear-to-r from-sky-400 to-cyan-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={toneFromPriority(topic.priority_weight >= 8 ? "high" : "medium")}>
                      weight {topic.priority_weight}
                    </Badge>
                    {topic.deadline_at && (
                      <Badge tone="neutral">Due {formatDateTime(topic.deadline_at)}</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No content state */}
      {studyData.sessions.length === 0 && studyData.topics.length === 0 && (
        <EmptyState
          title="No study data yet"
          description="Use the AI command above to create a study plan, generate sessions, or set up your first interview track."
        />
      )}

      {/* Advanced — manual CRUD */}
      <AdvancedSection title="Advanced — Manual Controls">
        {/* Generate sessions */}
        <FormCard
          badge="Generate"
          title="Generate sessions"
          description="Use the session generator with energy and availability hints."
        >
          <form
            className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
            onSubmit={(e) =>
              void (async () => {
                e.preventDefault();
                await runAction("generate", async () => {
                  await studyApi.generateSessions({
                    energy_preference: generationForm.energyPreference,
                    available_hours: Number(generationForm.availableHours),
                  });
                });
              })()
            }
          >
            <Field label="Energy preference">
              <Select
                value={generationForm.energyPreference}
                onChange={(e) =>
                  setGenerationForm({ ...generationForm, energyPreference: e.target.value })
                }
              >
                {["low", "medium", "high"].map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Available hours">
              <Input
                type="number"
                value={generationForm.availableHours}
                onChange={(e) =>
                  setGenerationForm({ ...generationForm, availableHours: e.target.value })
                }
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit" disabled={submitting === "generate"}>
                {submitting === "generate" ? "Generating…" : "Generate"}
              </Button>
            </div>
          </form>
        </FormCard>

        {/* Recover missed sessions */}
        <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-4">
          <div>
            <p className="text-sm font-medium text-white">Recover Missed Sessions</p>
            <p className="text-xs text-slate-500">
              Automatically reschedule sessions that were missed.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              void runAction("recover", async () => {
                await studyApi.recoverMissedSessions();
              })
            }
            disabled={submitting === "recover"}
          >
            {submitting === "recover" ? "Recovering…" : "Recover"}
          </Button>
        </div>

        {/* Create track */}
        <FormCard
          badge="Tracks"
          title="Create interview track"
          description="Capture role-specific lanes for interview preparation."
        >
          <form
            className="space-y-4"
            onSubmit={(e) =>
              void (async () => {
                e.preventDefault();
                await runAction("track", async () => {
                  await studyApi.createTrack({
                    name: trackForm.name,
                    description: trackForm.description || undefined,
                    target_role: trackForm.targetRole || undefined,
                    target_company: trackForm.targetCompany || undefined,
                    status: trackForm.status,
                  });
                  setTrackForm({ name: "", description: "", targetRole: "", targetCompany: "", status: "active" });
                });
              })()
            }
          >
            <Field label="Track name">
              <Input
                value={trackForm.name}
                onChange={(e) => setTrackForm({ ...trackForm, name: e.target.value })}
                required
              />
            </Field>
            <Field label="Description">
              <Textarea
                value={trackForm.description}
                onChange={(e) => setTrackForm({ ...trackForm, description: e.target.value })}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Target role">
                <Input
                  value={trackForm.targetRole}
                  onChange={(e) => setTrackForm({ ...trackForm, targetRole: e.target.value })}
                />
              </Field>
              <Field label="Target company">
                <Input
                  value={trackForm.targetCompany}
                  onChange={(e) => setTrackForm({ ...trackForm, targetCompany: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Status">
              <Select
                value={trackForm.status}
                onChange={(e) => setTrackForm({ ...trackForm, status: e.target.value })}
              >
                {["active", "paused", "completed"].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </Select>
            </Field>
            <Button type="submit" disabled={submitting === "track"}>
              {submitting === "track" ? "Creating…" : "Add Track"}
            </Button>
          </form>
        </FormCard>

        {/* Create topic */}
        <FormCard
          badge="Topics"
          title="Create study topic"
          description="Attach topics to a track and define weight, backlog, and deadlines."
        >
          <form
            className="space-y-4"
            onSubmit={(e) =>
              void (async () => {
                e.preventDefault();
                await runAction("topic", async () => {
                  await studyApi.createTopic({
                    interview_track_id: topicForm.interviewTrackId
                      ? Number(topicForm.interviewTrackId)
                      : undefined,
                    name: topicForm.name,
                    description: topicForm.description || undefined,
                    difficulty: topicForm.difficulty,
                    status: topicForm.status,
                    backlog_size: Number(topicForm.backlogSize),
                    priority_weight: Number(topicForm.priorityWeight),
                    deadline_at: toIsoString(topicForm.deadlineAt),
                    estimated_total_minutes: topicForm.estimatedTotalMinutes
                      ? Number(topicForm.estimatedTotalMinutes)
                      : undefined,
                  });
                  setTopicForm({
                    interviewTrackId: "", name: "", description: "", difficulty: "medium",
                    status: "not_started", backlogSize: "0", priorityWeight: "5",
                    deadlineAt: "", estimatedTotalMinutes: "",
                  });
                });
              })()
            }
          >
            <Field label="Track">
              <Select
                value={topicForm.interviewTrackId}
                onChange={(e) => setTopicForm({ ...topicForm, interviewTrackId: e.target.value })}
              >
                <option value="">No track</option>
                {studyData.tracks.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Topic name">
              <Input
                value={topicForm.name}
                onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })}
                required
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Difficulty">
                <Select
                  value={topicForm.difficulty}
                  onChange={(e) => setTopicForm({ ...topicForm, difficulty: e.target.value })}
                >
                  {["easy", "medium", "hard"].map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </Field>
              <Field label="Priority weight">
                <Input
                  type="number"
                  value={topicForm.priorityWeight}
                  onChange={(e) => setTopicForm({ ...topicForm, priorityWeight: e.target.value })}
                />
              </Field>
              <Field label="Estimated minutes">
                <Input
                  type="number"
                  value={topicForm.estimatedTotalMinutes}
                  onChange={(e) =>
                    setTopicForm({ ...topicForm, estimatedTotalMinutes: e.target.value })
                  }
                />
              </Field>
              <Field label="Deadline">
                <Input
                  type="datetime-local"
                  value={topicForm.deadlineAt}
                  onChange={(e) => setTopicForm({ ...topicForm, deadlineAt: e.target.value })}
                />
              </Field>
            </div>
            <Button type="submit" disabled={submitting === "topic"}>
              {submitting === "topic" ? "Creating…" : "Add Topic"}
            </Button>
          </form>
        </FormCard>

        {/* Create subtopic */}
        <FormCard
          badge="Subtopics"
          title="Create subtopic"
          description="Break a topic into focused practice units."
        >
          <form
            className="space-y-4"
            onSubmit={(e) =>
              void (async () => {
                e.preventDefault();
                await runAction("subtopic", async () => {
                  await studyApi.createSubtopic({
                    topic_id: Number(subtopicForm.topicId),
                    name: subtopicForm.name,
                    description: subtopicForm.description || undefined,
                    difficulty: subtopicForm.difficulty,
                    status: subtopicForm.status,
                    estimated_minutes: subtopicForm.estimatedMinutes
                      ? Number(subtopicForm.estimatedMinutes)
                      : undefined,
                    is_high_priority: subtopicForm.isHighPriority === "true",
                    deadline_at: toIsoString(subtopicForm.deadlineAt),
                  });
                  setSubtopicForm({
                    topicId: "", name: "", description: "", difficulty: "medium",
                    status: "not_started", estimatedMinutes: "", isHighPriority: "false", deadlineAt: "",
                  });
                });
              })()
            }
          >
            <Field label="Topic">
              <Select
                value={subtopicForm.topicId}
                onChange={(e) => setSubtopicForm({ ...subtopicForm, topicId: e.target.value })}
                required
              >
                <option value="">Select topic</option>
                {studyData.topics.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Subtopic name">
              <Input
                value={subtopicForm.name}
                onChange={(e) => setSubtopicForm({ ...subtopicForm, name: e.target.value })}
                required
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Estimated minutes">
                <Input
                  type="number"
                  value={subtopicForm.estimatedMinutes}
                  onChange={(e) =>
                    setSubtopicForm({ ...subtopicForm, estimatedMinutes: e.target.value })
                  }
                />
              </Field>
              <Field label="High priority">
                <Select
                  value={subtopicForm.isHighPriority}
                  onChange={(e) =>
                    setSubtopicForm({ ...subtopicForm, isHighPriority: e.target.value })
                  }
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </Select>
              </Field>
            </div>
            <Button type="submit" disabled={submitting === "subtopic"}>
              {submitting === "subtopic" ? "Creating…" : "Add Subtopic"}
            </Button>
          </form>
        </FormCard>

        {/* Create session manually */}
        <FormCard
          badge="Sessions"
          title="Create session manually"
          description="Schedule a focused study block against a topic."
        >
          <form
            className="space-y-4"
            onSubmit={(e) =>
              void (async () => {
                e.preventDefault();
                await runAction("session", async () => {
                  await studyApi.createSession({
                    topic_id: sessionForm.topicId ? Number(sessionForm.topicId) : undefined,
                    subtopic_id: sessionForm.subtopicId
                      ? Number(sessionForm.subtopicId)
                      : undefined,
                    title: sessionForm.title,
                    description: sessionForm.description || undefined,
                    scheduled_start_at: toIsoString(sessionForm.scheduledStartAt) ?? "",
                    scheduled_end_at: toIsoString(sessionForm.scheduledEndAt) ?? "",
                    planned_minutes: Number(sessionForm.plannedMinutes),
                    energy_preference: sessionForm.energyPreference,
                    session_type: sessionForm.sessionType,
                  });
                  setSessionForm({
                    topicId: "", subtopicId: "", title: "", description: "",
                    scheduledStartAt: "", scheduledEndAt: "", plannedMinutes: "60",
                    energyPreference: "medium", sessionType: "deep_work",
                  });
                });
              })()
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Topic">
                <Select
                  value={sessionForm.topicId}
                  onChange={(e) => setSessionForm({ ...sessionForm, topicId: e.target.value })}
                >
                  <option value="">Optional topic</option>
                  {studyData.topics.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Subtopic">
                <Select
                  value={sessionForm.subtopicId}
                  onChange={(e) => setSessionForm({ ...sessionForm, subtopicId: e.target.value })}
                >
                  <option value="">Optional subtopic</option>
                  {studyData.subtopics.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Title">
              <Input
                value={sessionForm.title}
                onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                required
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Scheduled start">
                <Input
                  type="datetime-local"
                  value={sessionForm.scheduledStartAt}
                  onChange={(e) =>
                    setSessionForm({ ...sessionForm, scheduledStartAt: e.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Scheduled end">
                <Input
                  type="datetime-local"
                  value={sessionForm.scheduledEndAt}
                  onChange={(e) =>
                    setSessionForm({ ...sessionForm, scheduledEndAt: e.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Planned minutes">
                <Input
                  type="number"
                  value={sessionForm.plannedMinutes}
                  onChange={(e) =>
                    setSessionForm({ ...sessionForm, plannedMinutes: e.target.value })
                  }
                />
              </Field>
              <Field label="Energy preference">
                <Select
                  value={sessionForm.energyPreference}
                  onChange={(e) =>
                    setSessionForm({ ...sessionForm, energyPreference: e.target.value })
                  }
                >
                  {["low", "medium", "high"].map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button type="submit" disabled={submitting === "session"}>
              {submitting === "session" ? "Creating…" : "Add Session"}
            </Button>
          </form>
        </FormCard>

        {/* All sessions table */}
        {studyData.sessions.length > 0 && (
          <Table<StudySession>
            data={studyData.sessions}
            rowKey={(s) => s.id}
            columns={[
              {
                header: "Session",
                render: (s) => (
                  <div className="space-y-1">
                    <p className="font-medium text-white">{s.title}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge>{s.session_type}</Badge>
                      <Badge tone={toneFromStatus(s.status)}>{s.status}</Badge>
                    </div>
                  </div>
                ),
              },
              {
                header: "Schedule",
                render: (s) => (
                  <div className="space-y-0.5 text-sm text-slate-400">
                    <p>{formatDateTime(s.scheduled_start_at)}</p>
                    <p className="text-xs text-slate-500">
                      {s.actual_minutes ?? s.planned_minutes} min
                    </p>
                  </div>
                ),
              },
              {
                header: "Actions",
                render: (s) => (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={submitting === `complete-${s.id}` || s.status === "completed"}
                    onClick={() =>
                      void runAction(`complete-${s.id}`, async () => {
                        await studyApi.completeSession(s.id, s.planned_minutes);
                      })
                    }
                  >
                    {submitting === `complete-${s.id}` ? "Saving…" : "Complete"}
                  </Button>
                ),
              },
            ]}
          />
        )}

        {/* Subtopics */}
        {studyData.subtopics.length > 0 && (
          <Card className="space-y-4">
            <h3 className="text-sm font-semibold text-white">All Subtopics</h3>
            <div className="grid gap-3">
              {studyData.subtopics.map((subtopic) => (
                <div
                  key={subtopic.id}
                  className="rounded-[24px] border border-white/8 bg-white/5 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={toneFromStatus(subtopic.status)}>{subtopic.status}</Badge>
                    {subtopic.is_high_priority ? <Badge tone="danger">High priority</Badge> : null}
                  </div>
                  <p className="mt-3 text-sm font-medium text-white">{subtopic.name}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {subtopic.completed_minutes}/{subtopic.estimated_minutes ?? 0} min ·{" "}
                    Deadline {formatDateTime(subtopic.deadline_at)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </AdvancedSection>
    </div>
  );
}

function SessionCard({
  session,
  submitting,
  onComplete,
}: {
  session: StudySession;
  submitting: string | null;
  onComplete: (id: number, mins: number) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/8 bg-slate-950/60 px-5 py-4">
      <div className="min-w-0 space-y-1.5">
        <p className="font-medium text-white">{session.title}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{session.session_type}</Badge>
          <Badge>{session.energy_preference}</Badge>
          <Badge tone={toneFromStatus(session.status)}>{session.status}</Badge>
        </div>
        <p className="text-xs text-slate-500">
          {formatDateTime(session.scheduled_start_at)} ·{" "}
          {session.actual_minutes ?? session.planned_minutes} min
        </p>
      </div>
      <Button
        size="sm"
        variant={session.status === "completed" ? "ghost" : "secondary"}
        disabled={submitting === `complete-${session.id}` || session.status === "completed"}
        onClick={() => onComplete(session.id, session.planned_minutes)}
        className="shrink-0"
      >
        {submitting === `complete-${session.id}` ? "Saving…" : session.status === "completed" ? "Done" : "Complete"}
      </Button>
    </div>
  );
}
