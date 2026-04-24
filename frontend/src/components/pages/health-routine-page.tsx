"use client";

import { useState } from "react";

import { ApiError, healthRoutineApi } from "@/lib/api";
import { formatDateTime, formatNumber, toIsoString, toneFromStatus } from "@/lib/format";
import { settledValue } from "@/lib/request";
import type {
  HealthInsightResponse,
  HealthProfile,
  HealthRecommendation,
  RecoveryLog,
  WorkoutPreference,
  WorkoutSession,
} from "@/lib/types";
import { useApiQuery } from "@/hooks/use-api-query";
import { Field, FormCard, KeyValueList } from "@/components/page-elements";
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

interface HealthData {
  profile: HealthProfile | null;
  preferences: WorkoutPreference[];
  recoveryLogs: RecoveryLog[];
  sessions: WorkoutSession[];
  recommendations: HealthRecommendation[];
  insights: HealthInsightResponse | null;
}

async function loadHealthData(): Promise<HealthData> {
  const results = await Promise.allSettled([
    healthRoutineApi.getProfile(),
    healthRoutineApi.listPreferences(),
    healthRoutineApi.listRecoveryLogs(),
    healthRoutineApi.listSessions(),
    healthRoutineApi.listRecommendations(),
    healthRoutineApi.insights(),
  ]);

  const profileResult = results[0];
  const profile =
    profileResult.status === "fulfilled"
      ? profileResult.value
      : profileResult.reason instanceof ApiError && profileResult.reason.status === 404
        ? null
        : null;

  return {
    profile,
    preferences: settledValue(results[1], []),
    recoveryLogs: settledValue(results[2], []),
    sessions: settledValue(results[3], []),
    recommendations: settledValue(results[4], []),
    insights: settledValue(results[5], null),
  };
}

export function HealthRoutinePage() {
  const { data, error, loading, reload } = useApiQuery(loadHealthData);
  const [profileForm, setProfileForm] = useState({
    primaryGoal: "general_fitness",
    fitnessLevel: "beginner",
    preferredWorkoutTime: "",
    weeklyWorkoutTarget: "4",
    minimumSessionMinutes: "30",
    idealSessionMinutes: "60",
    notes: "",
  });
  const [profileDirty, setProfileDirty] = useState(false);
  const [preferenceForm, setPreferenceForm] = useState({
    workoutType: "strength_training",
    priority: "5",
    minimumGapHours: "24",
    recoveryWindowHours: "24",
    isActive: "true",
  });
  const [recoveryForm, setRecoveryForm] = useState({
    sleepHours: "",
    sorenessLevel: "",
    stressLevel: "",
    hydrationLevel: "",
    energyLevel: "",
    notes: "",
  });
  const [sessionForm, setSessionForm] = useState({
    workoutType: "strength_training",
    title: "",
    scheduledStartAt: "",
    scheduledEndAt: "",
    plannedMinutes: "45",
    intensity: "medium",
    status: "planned",
    notes: "",
  });
  const [generateForm, setGenerateForm] = useState({
    availableMinutes: "60",
    energyLevel: "7",
  });
  const [submitting, setSubmitting] = useState<string | null>(null);

  const healthData = data ?? {
    profile: null,
    preferences: [],
    recoveryLogs: [],
    sessions: [],
    recommendations: [],
    insights: null,
  };
  const currentProfileForm =
    healthData.profile && !profileDirty
      ? {
          primaryGoal: healthData.profile.primary_goal,
          fitnessLevel: healthData.profile.fitness_level,
          preferredWorkoutTime: healthData.profile.preferred_workout_time ?? "",
          weeklyWorkoutTarget: String(healthData.profile.weekly_workout_target),
          minimumSessionMinutes: String(healthData.profile.minimum_session_minutes),
          idealSessionMinutes: String(healthData.profile.ideal_session_minutes),
          notes: healthData.profile.notes ?? "",
        }
      : profileForm;
  const updateProfileForm = (
    updates: Partial<typeof currentProfileForm>,
  ) => {
    setProfileDirty(true);
    setProfileForm({
      ...currentProfileForm,
      ...updates,
    });
  };

  if (loading && !data) {
    return (
      <LoadingState
        title="Loading health routine"
        description="Collecting profile, recovery logs, sessions, and recommendations."
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

  const profileExists = Boolean(healthData.profile);

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Health Agent"
        title="Health Routine"
        description="Manage health profile, workout preferences, recovery logs, planned sessions, generated sessions, and recommendation cards."
        actions={
          <>
            <Button variant="secondary" onClick={() => void reload()}>
              Refresh
            </Button>
            <Button
              onClick={() =>
                void runAction("generate-session", async () => {
                  await healthRoutineApi.generateSession({
                    available_minutes: Number(generateForm.availableMinutes),
                    energy_level: Number(generateForm.energyLevel),
                  });
                })
              }
              disabled={submitting === "generate-session"}
            >
              {submitting === "generate-session" ? "Generating..." : "Generate Workout Session"}
            </Button>
          </>
        }
      />

      {error ? <ErrorState description={error} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Recovery Score"
          value={formatNumber(healthData.insights?.recovery_score)}
          hint={healthData.insights?.recommended_action ?? "No recommendation yet"}
          tone="success"
        />
        <StatCard
          label="Workouts Completed"
          value={formatNumber(healthData.insights?.weekly_workouts_completed)}
          hint={`Target ${formatNumber(healthData.insights?.weekly_workout_target)}`}
        />
        <StatCard
          label="Recommendations"
          value={formatNumber(healthData.insights?.pending_recommendations)}
          hint="Open health recommendations"
          tone="warning"
        />
        <StatCard
          label="Last Workout Type"
          value={healthData.insights?.last_workout_type ?? "N/A"}
          hint="Most recent session type"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <FormCard
          badge="Profile"
          title={profileExists ? "Update health profile" : "Create health profile"}
          description="The backend allows a single profile per user; updates reuse the same route."
        >
          <form
            className="space-y-4"
            onSubmit={(event) =>
              void (async () => {
                event.preventDefault();
                await runAction("profile", async () => {
                  const payload = {
                    primary_goal: currentProfileForm.primaryGoal,
                    fitness_level: currentProfileForm.fitnessLevel,
                    preferred_workout_time:
                      currentProfileForm.preferredWorkoutTime || undefined,
                    weekly_workout_target: Number(currentProfileForm.weeklyWorkoutTarget),
                    minimum_session_minutes: Number(
                      currentProfileForm.minimumSessionMinutes,
                    ),
                    ideal_session_minutes: Number(currentProfileForm.idealSessionMinutes),
                    notes: currentProfileForm.notes || undefined,
                  };

                  if (profileExists) {
                    await healthRoutineApi.updateProfile(payload);
                  } else {
                    await healthRoutineApi.createProfile(payload);
                  }
                  setProfileDirty(false);
                });
              })()
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Primary goal">
                <Input
                  value={currentProfileForm.primaryGoal}
                  onChange={(event) =>
                    updateProfileForm({ primaryGoal: event.target.value })
                  }
                />
              </Field>
              <Field label="Fitness level">
                <Select
                  value={currentProfileForm.fitnessLevel}
                  onChange={(event) =>
                    updateProfileForm({ fitnessLevel: event.target.value })
                  }
                >
                  {["beginner", "intermediate", "advanced"].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Preferred workout time">
                <Input
                  value={currentProfileForm.preferredWorkoutTime}
                  onChange={(event) =>
                    updateProfileForm({ preferredWorkoutTime: event.target.value })
                  }
                />
              </Field>
              <Field label="Weekly workout target">
                <Input
                  type="number"
                  value={currentProfileForm.weeklyWorkoutTarget}
                  onChange={(event) =>
                    updateProfileForm({ weeklyWorkoutTarget: event.target.value })
                  }
                />
              </Field>
              <Field label="Minimum session minutes">
                <Input
                  type="number"
                  value={currentProfileForm.minimumSessionMinutes}
                  onChange={(event) =>
                    updateProfileForm({ minimumSessionMinutes: event.target.value })
                  }
                />
              </Field>
              <Field label="Ideal session minutes">
                <Input
                  type="number"
                  value={currentProfileForm.idealSessionMinutes}
                  onChange={(event) =>
                    updateProfileForm({ idealSessionMinutes: event.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Notes">
              <Textarea
                value={currentProfileForm.notes}
                onChange={(event) => updateProfileForm({ notes: event.target.value })}
              />
            </Field>
            <Button type="submit" disabled={submitting === "profile"}>
              {submitting === "profile"
                ? "Saving..."
                : profileExists
                  ? "Update Profile"
                  : "Create Profile"}
            </Button>
          </form>

          {healthData.profile ? (
            <KeyValueList
              items={[
                { label: "Primary goal", value: healthData.profile.primary_goal },
                { label: "Fitness level", value: healthData.profile.fitness_level },
                {
                  label: "Workout target",
                  value: `${healthData.profile.weekly_workout_target} sessions`,
                },
                {
                  label: "Preferred time",
                  value: healthData.profile.preferred_workout_time ?? "Not set",
                },
              ]}
            />
          ) : null}
        </FormCard>

        <div className="space-y-4">
          <FormCard
            badge="Preferences"
            title="Add workout preference"
            description="Define preferred workout types, recovery gaps, and priority."
          >
            <form
              className="space-y-4"
              onSubmit={(event) =>
                void (async () => {
                  event.preventDefault();
                  await runAction("preference", async () => {
                    await healthRoutineApi.createPreference({
                      workout_type: preferenceForm.workoutType,
                      priority: Number(preferenceForm.priority),
                      minimum_gap_hours: Number(preferenceForm.minimumGapHours),
                      recovery_window_hours: Number(preferenceForm.recoveryWindowHours),
                      is_active: preferenceForm.isActive === "true",
                    });
                    setPreferenceForm({
                      workoutType: "strength_training",
                      priority: "5",
                      minimumGapHours: "24",
                      recoveryWindowHours: "24",
                      isActive: "true",
                    });
                  });
                })()
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Workout type">
                  <Input
                    value={preferenceForm.workoutType}
                    onChange={(event) =>
                      setPreferenceForm({
                        ...preferenceForm,
                        workoutType: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Priority">
                  <Input
                    type="number"
                    value={preferenceForm.priority}
                    onChange={(event) =>
                      setPreferenceForm({
                        ...preferenceForm,
                        priority: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Minimum gap hours">
                  <Input
                    type="number"
                    value={preferenceForm.minimumGapHours}
                    onChange={(event) =>
                      setPreferenceForm({
                        ...preferenceForm,
                        minimumGapHours: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Recovery window hours">
                  <Input
                    type="number"
                    value={preferenceForm.recoveryWindowHours}
                    onChange={(event) =>
                      setPreferenceForm({
                        ...preferenceForm,
                        recoveryWindowHours: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Active">
                  <Select
                    value={preferenceForm.isActive}
                    onChange={(event) =>
                      setPreferenceForm({
                        ...preferenceForm,
                        isActive: event.target.value,
                      })
                    }
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </Select>
                </Field>
              </div>
              <Button type="submit" disabled={submitting === "preference"}>
                {submitting === "preference" ? "Saving..." : "Add Preference"}
              </Button>
            </form>
          </FormCard>

          <FormCard
            badge="Generator"
            title="Generate workout session"
            description="Use available minutes and energy level to create a recommended session."
          >
            <form
              className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
              onSubmit={(event) =>
                void (async () => {
                  event.preventDefault();
                  await runAction("generate-session", async () => {
                    await healthRoutineApi.generateSession({
                      available_minutes: Number(generateForm.availableMinutes),
                      energy_level: Number(generateForm.energyLevel),
                    });
                  });
                })()
              }
            >
              <Field label="Available minutes">
                <Input
                  type="number"
                  value={generateForm.availableMinutes}
                  onChange={(event) =>
                    setGenerateForm({
                      ...generateForm,
                      availableMinutes: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Energy level">
                <Input
                  type="number"
                  value={generateForm.energyLevel}
                  onChange={(event) =>
                    setGenerateForm({
                      ...generateForm,
                      energyLevel: event.target.value,
                    })
                  }
                />
              </Field>
              <div className="flex items-end">
                <Button type="submit" disabled={submitting === "generate-session"}>
                  {submitting === "generate-session" ? "Generating..." : "Generate"}
                </Button>
              </div>
            </form>
          </FormCard>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <FormCard
          badge="Recovery"
          title="Log recovery"
          description="Track recovery inputs that feed score calculation and recommendation generation."
        >
          <form
            className="space-y-4"
            onSubmit={(event) =>
              void (async () => {
                event.preventDefault();
                await runAction("recovery", async () => {
                  await healthRoutineApi.createRecoveryLog({
                    sleep_hours: recoveryForm.sleepHours ? Number(recoveryForm.sleepHours) : undefined,
                    soreness_level: recoveryForm.sorenessLevel
                      ? Number(recoveryForm.sorenessLevel)
                      : undefined,
                    stress_level: recoveryForm.stressLevel ? Number(recoveryForm.stressLevel) : undefined,
                    hydration_level: recoveryForm.hydrationLevel
                      ? Number(recoveryForm.hydrationLevel)
                      : undefined,
                    energy_level: recoveryForm.energyLevel ? Number(recoveryForm.energyLevel) : undefined,
                    notes: recoveryForm.notes || undefined,
                  });
                  setRecoveryForm({
                    sleepHours: "",
                    sorenessLevel: "",
                    stressLevel: "",
                    hydrationLevel: "",
                    energyLevel: "",
                    notes: "",
                  });
                });
              })()
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Sleep hours">
                <Input
                  type="number"
                  value={recoveryForm.sleepHours}
                  onChange={(event) =>
                    setRecoveryForm({ ...recoveryForm, sleepHours: event.target.value })
                  }
                />
              </Field>
              <Field label="Soreness level">
                <Input
                  type="number"
                  value={recoveryForm.sorenessLevel}
                  onChange={(event) =>
                    setRecoveryForm({
                      ...recoveryForm,
                      sorenessLevel: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Stress level">
                <Input
                  type="number"
                  value={recoveryForm.stressLevel}
                  onChange={(event) =>
                    setRecoveryForm({ ...recoveryForm, stressLevel: event.target.value })
                  }
                />
              </Field>
              <Field label="Hydration level">
                <Input
                  type="number"
                  value={recoveryForm.hydrationLevel}
                  onChange={(event) =>
                    setRecoveryForm({
                      ...recoveryForm,
                      hydrationLevel: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Energy level">
                <Input
                  type="number"
                  value={recoveryForm.energyLevel}
                  onChange={(event) =>
                    setRecoveryForm({ ...recoveryForm, energyLevel: event.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Notes">
              <Textarea
                value={recoveryForm.notes}
                onChange={(event) =>
                  setRecoveryForm({ ...recoveryForm, notes: event.target.value })
                }
              />
            </Field>
            <Button type="submit" disabled={submitting === "recovery"}>
              {submitting === "recovery" ? "Saving..." : "Create Recovery Log"}
            </Button>
          </form>
        </FormCard>

        <FormCard
          badge="Sessions"
          title="Create workout session"
          description="Manually schedule or log workout sessions against the routine system."
        >
          <form
            className="space-y-4"
            onSubmit={(event) =>
              void (async () => {
                event.preventDefault();
                await runAction("session", async () => {
                  await healthRoutineApi.createSession({
                    workout_type: sessionForm.workoutType,
                    title: sessionForm.title,
                    scheduled_start_at: toIsoString(sessionForm.scheduledStartAt),
                    scheduled_end_at: toIsoString(sessionForm.scheduledEndAt),
                    planned_minutes: Number(sessionForm.plannedMinutes),
                    intensity: sessionForm.intensity,
                    status: sessionForm.status,
                    notes: sessionForm.notes || undefined,
                  });
                  setSessionForm({
                    workoutType: "strength_training",
                    title: "",
                    scheduledStartAt: "",
                    scheduledEndAt: "",
                    plannedMinutes: "45",
                    intensity: "medium",
                    status: "planned",
                    notes: "",
                  });
                });
              })()
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Workout type">
                <Input
                  value={sessionForm.workoutType}
                  onChange={(event) =>
                    setSessionForm({ ...sessionForm, workoutType: event.target.value })
                  }
                />
              </Field>
              <Field label="Title">
                <Input
                  value={sessionForm.title}
                  onChange={(event) =>
                    setSessionForm({ ...sessionForm, title: event.target.value })
                  }
                  required
                />
              </Field>
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
              <Field label="Intensity">
                <Select
                  value={sessionForm.intensity}
                  onChange={(event) =>
                    setSessionForm({ ...sessionForm, intensity: event.target.value })
                  }
                >
                  {["low", "medium", "high"].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  value={sessionForm.status}
                  onChange={(event) =>
                    setSessionForm({ ...sessionForm, status: event.target.value })
                  }
                >
                  {["planned", "completed", "skipped"].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Notes">
              <Textarea
                value={sessionForm.notes}
                onChange={(event) =>
                  setSessionForm({ ...sessionForm, notes: event.target.value })
                }
              />
            </Field>
            <Button type="submit" disabled={submitting === "session"}>
              {submitting === "session" ? "Saving..." : "Create Workout Session"}
            </Button>
          </form>
        </FormCard>
      </div>

      <Table<WorkoutPreference>
        data={healthData.preferences}
        rowKey={(preference) => preference.id}
        columns={[
          {
            header: "Preference",
            render: (preference) => (
              <div className="space-y-2">
                <p className="font-medium text-white">{preference.workout_type}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge>{preference.priority}</Badge>
                  <Badge tone={toneFromStatus(preference.is_active ? "active" : "inactive")}>
                    {preference.is_active ? "active" : "inactive"}
                  </Badge>
                </div>
              </div>
            ),
          },
          {
            header: "Recovery",
            render: (preference) => (
              <div className="space-y-1 text-sm text-slate-300">
                <p>Gap {preference.minimum_gap_hours} hours</p>
                <p className="text-xs text-slate-500">
                  Window {preference.recovery_window_hours} hours
                </p>
              </div>
            ),
          },
        ]}
      />

      <Table<RecoveryLog>
        data={healthData.recoveryLogs}
        rowKey={(log) => log.id}
        columns={[
          {
            header: "Recovery",
            render: (log) => (
              <div className="space-y-2">
                <p className="font-medium text-white">Score {log.recovery_score}</p>
                <p className="text-sm text-slate-400">{log.notes ?? "No notes"}</p>
              </div>
            ),
          },
          {
            header: "Signals",
            render: (log) => (
              <div className="space-y-1 text-sm text-slate-300">
                <p>Sleep {log.sleep_hours ?? "N/A"}h</p>
                <p className="text-xs text-slate-500">
                  Energy {log.energy_level ?? "N/A"} · Stress {log.stress_level ?? "N/A"}
                </p>
              </div>
            ),
          },
          {
            header: "Logged",
            render: (log) => (
              <p className="text-sm text-slate-300">{formatDateTime(log.logged_at)}</p>
            ),
          },
        ]}
      />

      <Table<WorkoutSession>
        data={healthData.sessions}
        rowKey={(session) => session.id}
        columns={[
          {
            header: "Session",
            render: (session) => (
              <div className="space-y-2">
                <p className="font-medium text-white">{session.title}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge>{session.workout_type}</Badge>
                  <Badge tone={toneFromStatus(session.status)}>{session.status}</Badge>
                </div>
              </div>
            ),
          },
          {
            header: "Window",
            render: (session) => (
              <div className="space-y-1 text-sm text-slate-300">
                <p>{formatDateTime(session.scheduled_start_at)}</p>
                <p className="text-xs text-slate-500">
                  {session.actual_minutes ?? session.planned_minutes} minutes · {session.intensity}
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
                disabled={submitting === `session-${session.id}` || session.status === "completed"}
                onClick={() =>
                  void runAction(`session-${session.id}`, async () => {
                    await healthRoutineApi.updateSession(session.id, {
                      status: "completed",
                      actual_minutes: session.actual_minutes ?? session.planned_minutes,
                    });
                  })
                }
              >
                {submitting === `session-${session.id}` ? "Saving..." : "Mark Completed"}
              </Button>
            ),
          },
        ]}
      />

      <Card className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-white">Recommendations</h3>
          <p className="text-sm text-slate-400">
            Recovery-driven guidance returned by the health recommendation service.
          </p>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {healthData.recommendations.map((recommendation) => (
            <div
              key={recommendation.id}
              className="rounded-[24px] border border-white/8 bg-white/5 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{recommendation.recommendation_type}</Badge>
                <Badge tone={toneFromStatus(recommendation.status)}>
                  {recommendation.status}
                </Badge>
              </div>
              <p className="mt-3 text-sm font-medium text-white">{recommendation.title}</p>
              {recommendation.description ? (
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {recommendation.description}
                </p>
              ) : null}
            </div>
          ))}
          {!healthData.recommendations.length ? (
            <div className="rounded-[24px] border border-dashed border-white/12 bg-white/4 p-5 text-sm text-slate-400 lg:col-span-2">
              No health recommendations are available yet.
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
