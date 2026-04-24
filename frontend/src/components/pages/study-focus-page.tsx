"use client";

import { useState } from "react";

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
import {
  Badge,
  Button,
  Card,
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

  if (loading && !data) {
    return (
      <LoadingState
        title="Loading study focus"
        description="Collecting tracks, topics, sessions, and insights."
      />
    );
  }

  const studyData = data ?? {
    tracks: [],
    topics: [],
    subtopics: [],
    sessions: [],
    insights: null,
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
        eyebrow="Study Agent"
        title="Study Focus"
        description="Manage interview tracks, learning topics, study sessions, session recovery, and insight cards."
        actions={
          <>
            <Button variant="secondary" onClick={() => void reload()}>
              Refresh
            </Button>
            <Button
              onClick={() =>
                void runAction("recover", async () => {
                  await studyApi.recoverMissedSessions();
                })
              }
              disabled={submitting === "recover"}
            >
              {submitting === "recover" ? "Recovering..." : "Recover Missed Sessions"}
            </Button>
          </>
        }
      />

      {error ? <ErrorState description={error} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pending Sessions"
          value={formatNumber(studyData.insights?.pending_sessions)}
          hint="Upcoming study sessions"
          tone="warning"
        />
        <StatCard
          label="Missed Sessions"
          value={formatNumber(studyData.insights?.missed_sessions)}
          hint="Sessions needing recovery"
          tone="danger"
        />
        <StatCard
          label="Current Streak"
          value={formatNumber(studyData.insights?.current_streak_days)}
          hint="Consecutive study days"
          tone="success"
        />
        <StatCard
          label="Weekly Coverage"
          value={formatNumber(studyData.insights?.estimated_weekly_coverage_minutes)}
          hint="Estimated covered minutes"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <FormCard
            badge="Tracks"
            title="Create interview track"
            description="Capture role-specific lanes for interview preparation."
          >
            <form
              className="space-y-4"
              onSubmit={(event) =>
                void (async () => {
                  event.preventDefault();
                  await runAction("track", async () => {
                    await studyApi.createTrack({
                      name: trackForm.name,
                      description: trackForm.description || undefined,
                      target_role: trackForm.targetRole || undefined,
                      target_company: trackForm.targetCompany || undefined,
                      status: trackForm.status,
                    });
                    setTrackForm({
                      name: "",
                      description: "",
                      targetRole: "",
                      targetCompany: "",
                      status: "active",
                    });
                  });
                })()
              }
            >
              <Field label="Track name">
                <Input
                  value={trackForm.name}
                  onChange={(event) =>
                    setTrackForm({ ...trackForm, name: event.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Description">
                <Textarea
                  value={trackForm.description}
                  onChange={(event) =>
                    setTrackForm({ ...trackForm, description: event.target.value })
                  }
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Target role">
                  <Input
                    value={trackForm.targetRole}
                    onChange={(event) =>
                      setTrackForm({ ...trackForm, targetRole: event.target.value })
                    }
                  />
                </Field>
                <Field label="Target company">
                  <Input
                    value={trackForm.targetCompany}
                    onChange={(event) =>
                      setTrackForm({ ...trackForm, targetCompany: event.target.value })
                    }
                  />
                </Field>
              </div>
              <Field label="Status">
                <Select
                  value={trackForm.status}
                  onChange={(event) =>
                    setTrackForm({ ...trackForm, status: event.target.value })
                  }
                >
                  {["active", "paused", "completed"].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button type="submit" disabled={submitting === "track"}>
                {submitting === "track" ? "Creating..." : "Add Track"}
              </Button>
            </form>
          </FormCard>

          <FormCard
            badge="Topics"
            title="Create study topic"
            description="Attach topics to a track and define weight, backlog, and deadlines."
          >
            <form
              className="space-y-4"
              onSubmit={(event) =>
                void (async () => {
                  event.preventDefault();
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
                  });
                })()
              }
            >
              <Field label="Track">
                <Select
                  value={topicForm.interviewTrackId}
                  onChange={(event) =>
                    setTopicForm({ ...topicForm, interviewTrackId: event.target.value })
                  }
                >
                  <option value="">No track</option>
                  {studyData.tracks.map((track) => (
                    <option key={track.id} value={track.id}>
                      {track.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Topic name">
                <Input
                  value={topicForm.name}
                  onChange={(event) =>
                    setTopicForm({ ...topicForm, name: event.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Description">
                <Textarea
                  value={topicForm.description}
                  onChange={(event) =>
                    setTopicForm({ ...topicForm, description: event.target.value })
                  }
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Difficulty">
                  <Select
                    value={topicForm.difficulty}
                    onChange={(event) =>
                      setTopicForm({ ...topicForm, difficulty: event.target.value })
                    }
                  >
                    {["easy", "medium", "hard"].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Status">
                  <Select
                    value={topicForm.status}
                    onChange={(event) =>
                      setTopicForm({ ...topicForm, status: event.target.value })
                    }
                  >
                    {["not_started", "in_progress", "completed"].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Backlog size">
                  <Input
                    type="number"
                    value={topicForm.backlogSize}
                    onChange={(event) =>
                      setTopicForm({ ...topicForm, backlogSize: event.target.value })
                    }
                  />
                </Field>
                <Field label="Priority weight">
                  <Input
                    type="number"
                    value={topicForm.priorityWeight}
                    onChange={(event) =>
                      setTopicForm({ ...topicForm, priorityWeight: event.target.value })
                    }
                  />
                </Field>
                <Field label="Deadline">
                  <Input
                    type="datetime-local"
                    value={topicForm.deadlineAt}
                    onChange={(event) =>
                      setTopicForm({ ...topicForm, deadlineAt: event.target.value })
                    }
                  />
                </Field>
                <Field label="Estimated minutes">
                  <Input
                    type="number"
                    value={topicForm.estimatedTotalMinutes}
                    onChange={(event) =>
                      setTopicForm({
                        ...topicForm,
                        estimatedTotalMinutes: event.target.value,
                      })
                    }
                  />
                </Field>
              </div>
              <Button type="submit" disabled={submitting === "topic"}>
                {submitting === "topic" ? "Creating..." : "Add Topic"}
              </Button>
            </form>
          </FormCard>

          <FormCard
            badge="Generate"
            title="Generate sessions"
            description="Use the session generator endpoint with energy and availability hints."
          >
            <form
              className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
              onSubmit={(event) =>
                void (async () => {
                  event.preventDefault();
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
                  onChange={(event) =>
                    setGenerationForm({
                      ...generationForm,
                      energyPreference: event.target.value,
                    })
                  }
                >
                  {["low", "medium", "high"].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Available hours">
                <Input
                  type="number"
                  value={generationForm.availableHours}
                  onChange={(event) =>
                    setGenerationForm({
                      ...generationForm,
                      availableHours: event.target.value,
                    })
                  }
                />
              </Field>
              <div className="flex items-end">
                <Button type="submit" disabled={submitting === "generate"}>
                  {submitting === "generate" ? "Generating..." : "Generate"}
                </Button>
              </div>
            </form>
          </FormCard>
        </div>

        <div className="space-y-4">
          <FormCard
            badge="Subtopics"
            title="Create subtopic"
            description="Break a topic into focused practice units with deadlines and priority flags."
          >
            <form
              className="space-y-4"
              onSubmit={(event) =>
                void (async () => {
                  event.preventDefault();
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
                      topicId: "",
                      name: "",
                      description: "",
                      difficulty: "medium",
                      status: "not_started",
                      estimatedMinutes: "",
                      isHighPriority: "false",
                      deadlineAt: "",
                    });
                  });
                })()
              }
            >
              <Field label="Topic">
                <Select
                  value={subtopicForm.topicId}
                  onChange={(event) =>
                    setSubtopicForm({ ...subtopicForm, topicId: event.target.value })
                  }
                  required
                >
                  <option value="">Select topic</option>
                  {studyData.topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Subtopic name">
                <Input
                  value={subtopicForm.name}
                  onChange={(event) =>
                    setSubtopicForm({ ...subtopicForm, name: event.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Description">
                <Textarea
                  value={subtopicForm.description}
                  onChange={(event) =>
                    setSubtopicForm({ ...subtopicForm, description: event.target.value })
                  }
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Difficulty">
                  <Select
                    value={subtopicForm.difficulty}
                    onChange={(event) =>
                      setSubtopicForm({ ...subtopicForm, difficulty: event.target.value })
                    }
                  >
                    {["easy", "medium", "hard"].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Status">
                  <Select
                    value={subtopicForm.status}
                    onChange={(event) =>
                      setSubtopicForm({ ...subtopicForm, status: event.target.value })
                    }
                  >
                    {["not_started", "in_progress", "completed"].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Estimated minutes">
                  <Input
                    type="number"
                    value={subtopicForm.estimatedMinutes}
                    onChange={(event) =>
                      setSubtopicForm({
                        ...subtopicForm,
                        estimatedMinutes: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="High priority">
                  <Select
                    value={subtopicForm.isHighPriority}
                    onChange={(event) =>
                      setSubtopicForm({
                        ...subtopicForm,
                        isHighPriority: event.target.value,
                      })
                    }
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </Select>
                </Field>
                <Field label="Deadline">
                  <Input
                    type="datetime-local"
                    value={subtopicForm.deadlineAt}
                    onChange={(event) =>
                      setSubtopicForm({ ...subtopicForm, deadlineAt: event.target.value })
                    }
                  />
                </Field>
              </div>
              <Button type="submit" disabled={submitting === "subtopic"}>
                {submitting === "subtopic" ? "Creating..." : "Add Subtopic"}
              </Button>
            </form>
          </FormCard>

          <FormCard
            badge="Sessions"
            title="Create session"
            description="Manually schedule focused study work against topics and subtopics."
          >
            <form
              className="space-y-4"
              onSubmit={(event) =>
                void (async () => {
                  event.preventDefault();
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
                  });
                })()
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Topic">
                  <Select
                    value={sessionForm.topicId}
                    onChange={(event) =>
                      setSessionForm({ ...sessionForm, topicId: event.target.value })
                    }
                  >
                    <option value="">Optional topic</option>
                    {studyData.topics.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Subtopic">
                  <Select
                    value={sessionForm.subtopicId}
                    onChange={(event) =>
                      setSessionForm({ ...sessionForm, subtopicId: event.target.value })
                    }
                  >
                    <option value="">Optional subtopic</option>
                    {studyData.subtopics.map((subtopic) => (
                      <option key={subtopic.id} value={subtopic.id}>
                        {subtopic.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Title">
                <Input
                  value={sessionForm.title}
                  onChange={(event) =>
                    setSessionForm({ ...sessionForm, title: event.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Description">
                <Textarea
                  value={sessionForm.description}
                  onChange={(event) =>
                    setSessionForm({ ...sessionForm, description: event.target.value })
                  }
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Scheduled start">
                  <Input
                    type="datetime-local"
                    value={sessionForm.scheduledStartAt}
                    onChange={(event) =>
                      setSessionForm({
                        ...sessionForm,
                        scheduledStartAt: event.target.value,
                      })
                    }
                    required
                  />
                </Field>
                <Field label="Scheduled end">
                  <Input
                    type="datetime-local"
                    value={sessionForm.scheduledEndAt}
                    onChange={(event) =>
                      setSessionForm({
                        ...sessionForm,
                        scheduledEndAt: event.target.value,
                      })
                    }
                    required
                  />
                </Field>
                <Field label="Planned minutes">
                  <Input
                    type="number"
                    value={sessionForm.plannedMinutes}
                    onChange={(event) =>
                      setSessionForm({
                        ...sessionForm,
                        plannedMinutes: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Energy preference">
                  <Select
                    value={sessionForm.energyPreference}
                    onChange={(event) =>
                      setSessionForm({
                        ...sessionForm,
                        energyPreference: event.target.value,
                      })
                    }
                  >
                    {["low", "medium", "high"].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Session type">
                  <Input
                    value={sessionForm.sessionType}
                    onChange={(event) =>
                      setSessionForm({
                        ...sessionForm,
                        sessionType: event.target.value,
                      })
                    }
                  />
                </Field>
              </div>
              <Button type="submit" disabled={submitting === "session"}>
                {submitting === "session" ? "Creating..." : "Add Session"}
              </Button>
            </form>
          </FormCard>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Table<StudyTopic>
          data={studyData.topics}
          rowKey={(topic) => topic.id}
          columns={[
            {
              header: "Topic",
              render: (topic) => (
                <div className="space-y-2">
                  <p className="font-medium text-white">{topic.name}</p>
                  {topic.description ? (
                    <p className="text-sm leading-6 text-slate-400">{topic.description}</p>
                  ) : null}
                </div>
              ),
            },
            {
              header: "Progress",
              render: (topic) => (
                <div className="space-y-1 text-sm text-slate-300">
                  <p>{topic.completed_minutes} min complete</p>
                  <p className="text-xs text-slate-500">
                    {topic.estimated_total_minutes ?? 0} min estimated
                  </p>
                </div>
              ),
            },
            {
              header: "Meta",
              render: (topic) => (
                <div className="flex flex-wrap gap-2">
                  <Badge tone={toneFromStatus(topic.status)}>{topic.status}</Badge>
                  <Badge tone={toneFromPriority(topic.priority_weight >= 8 ? "high" : "medium")}>
                    weight {topic.priority_weight}
                  </Badge>
                </div>
              ),
            },
          ]}
        />

        <Card className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-white">Subtopics</h3>
            <p className="text-sm text-slate-400">
              Granular learning units tied to parent topics.
            </p>
          </div>
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
                {subtopic.description ? (
                  <p className="mt-2 text-sm leading-6 text-slate-400">{subtopic.description}</p>
                ) : null}
                <p className="mt-2 text-xs text-slate-500">
                  Deadline {formatDateTime(subtopic.deadline_at)} ·{" "}
                  {subtopic.completed_minutes}/{subtopic.estimated_minutes ?? 0} min
                </p>
              </div>
            ))}
            {!studyData.subtopics.length ? (
              <div className="rounded-[24px] border border-dashed border-white/12 bg-white/4 p-5 text-sm text-slate-400">
                No subtopics created yet.
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <Table<StudySession>
        data={studyData.sessions}
        rowKey={(session) => session.id}
        columns={[
          {
            header: "Session",
            render: (session) => (
              <div className="space-y-2">
                <p className="font-medium text-white">{session.title}</p>
                {session.description ? (
                  <p className="text-sm leading-6 text-slate-400">{session.description}</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Badge>{session.energy_preference}</Badge>
                  <Badge>{session.session_type}</Badge>
                  <Badge tone={toneFromStatus(session.status)}>{session.status}</Badge>
                </div>
              </div>
            ),
          },
          {
            header: "Schedule",
            render: (session) => (
              <div className="space-y-1 text-sm text-slate-300">
                <p>{formatDateTime(session.scheduled_start_at)}</p>
                <p className="text-xs text-slate-500">
                  {formatDateTime(session.scheduled_end_at)}
                </p>
                <p className="text-xs text-slate-500">
                  {session.actual_minutes ?? session.planned_minutes} min
                </p>
              </div>
            ),
          },
          {
            header: "Actions",
            render: (session) => (
              <Button
                size="sm"
                variant="secondary"
                disabled={submitting === `complete-${session.id}` || session.status === "completed"}
                onClick={() =>
                  void runAction(`complete-${session.id}`, async () => {
                    await studyApi.completeSession(session.id, session.planned_minutes);
                  })
                }
              >
                {submitting === `complete-${session.id}` ? "Saving..." : "Complete"}
              </Button>
            ),
          },
        ]}
      />
    </div>
  );
}
