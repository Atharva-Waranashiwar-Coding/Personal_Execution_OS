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
import { AICommandBox } from "@/components/ai/AICommandBox";
import {
  AdvancedSection,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  LoadingState,
  SectionHeader,
  Select,
  StatCard,
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

const HEALTH_EXAMPLES = [
  "Log my workout: 45 min strength training, high intensity.",
  "I slept 7 hours, soreness level 4. Update my recovery.",
  "Generate a workout plan for this week based on my recovery.",
];

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
    sleepHours: "", sorenessLevel: "", stressLevel: "",
    hydrationLevel: "", energyLevel: "", notes: "",
  });
  const [sessionForm, setSessionForm] = useState({
    workoutType: "strength_training", title: "", scheduledStartAt: "",
    scheduledEndAt: "", plannedMinutes: "45", intensity: "medium",
    status: "planned", notes: "",
  });
  const [generateForm, setGenerateForm] = useState({
    availableMinutes: "60", energyLevel: "7",
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

  const healthData = data ?? {
    profile: null, preferences: [], recoveryLogs: [], sessions: [], recommendations: [], insights: null,
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

  const updateProfileForm = (updates: Partial<typeof currentProfileForm>) => {
    setProfileDirty(true);
    setProfileForm({ ...currentProfileForm, ...updates });
  };

  const profileExists = Boolean(healthData.profile);

  const upcomingSessions = healthData.sessions
    .filter((s) => s.status !== "completed")
    .sort((a, b) => {
      const aTime = a.scheduled_start_at ? new Date(a.scheduled_start_at).getTime() : Infinity;
      const bTime = b.scheduled_start_at ? new Date(b.scheduled_start_at).getTime() : Infinity;
      return aTime - bTime;
    })
    .slice(0, 5);

  const recentRecovery = [...healthData.recoveryLogs]
    .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())
    .slice(0, 3);

  const activeRecommendations = healthData.recommendations.filter(
    (r) => r.status === "pending" || r.status === "active",
  );

  if (loading && !data) {
    return (
      <LoadingState
        title="Loading health routine"
        description="Collecting profile, recovery logs, sessions, and recommendations."
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Health Agent"
        title="Health Routine"
        description="Tell the AI to log workouts, update recovery, and generate workout plans. Track your health metrics below."
        actions={
          <Button variant="secondary" size="sm" onClick={() => void reload()}>
            Refresh
          </Button>
        }
      />

      {error ? <ErrorState description={error} /> : null}

      {/* AI Command */}
      <AICommandBox
        placeholder="Log my workout, update recovery, or generate a plan for this week."
        examples={HEALTH_EXAMPLES}
        onComplete={() => void reload()}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Recovery Score"
          value={formatNumber(healthData.insights?.recovery_score)}
          hint={healthData.insights?.recommended_action ?? "No recommendation yet"}
          tone="success"
        />
        <StatCard
          label="Workouts This Week"
          value={formatNumber(healthData.insights?.weekly_workouts_completed)}
          hint={`Target: ${formatNumber(healthData.insights?.weekly_workout_target)}`}
        />
        <StatCard
          label="Recommendations"
          value={formatNumber(healthData.insights?.pending_recommendations)}
          hint="Active health recommendations"
          tone="warning"
        />
        <StatCard
          label="Last Workout"
          value={healthData.insights?.last_workout_type ?? "—"}
          hint="Most recent session type"
        />
      </div>

      {/* Generate session — stays in primary view since it's AI-powered */}
      <div className="overflow-hidden rounded-2xl border border-emerald-400/15 bg-slate-950/60">
        <div className="border-b border-white/6 px-5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-400/70">
            Generate Workout
          </p>
        </div>
        <form
          className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={(e) =>
            void (async () => {
              e.preventDefault();
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
              onChange={(e) => setGenerateForm({ ...generateForm, availableMinutes: e.target.value })}
            />
          </Field>
          <Field label="Energy level (1–10)">
            <Input
              type="number"
              min="1"
              max="10"
              value={generateForm.energyLevel}
              onChange={(e) => setGenerateForm({ ...generateForm, energyLevel: e.target.value })}
            />
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={submitting === "generate-session"}>
              {submitting === "generate-session" ? "Generating…" : "Generate"}
            </Button>
          </div>
        </form>
      </div>

      {/* Active recommendations */}
      {activeRecommendations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">Recommendations</h3>
          <div className="grid gap-3">
            {activeRecommendations.map((rec) => (
              <div
                key={rec.id}
                className="rounded-2xl border border-white/8 bg-slate-950/60 px-5 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">
                      {rec.title ?? rec.recommendation_type}
                    </p>
                    {rec.description && (
                      <p className="text-sm leading-6 text-slate-400">{rec.description}</p>
                    )}
                  </div>
                  <Badge tone={toneFromStatus(rec.status)}>{rec.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming sessions */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-300">Upcoming Sessions</h3>
        {upcomingSessions.length === 0 ? (
          <EmptyState
            title="No upcoming sessions"
            description="Use Generate Workout above or ask the AI to plan sessions for this week."
          />
        ) : (
          <div className="grid gap-3">
            {upcomingSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-start justify-between gap-4 rounded-2xl border border-white/8 bg-slate-950/60 px-5 py-4"
              >
                <div className="space-y-1.5">
                  <p className="font-medium text-white">{session.title}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{session.workout_type}</Badge>
                    <Badge>{session.intensity}</Badge>
                    <Badge tone={toneFromStatus(session.status)}>{session.status}</Badge>
                  </div>
                  {session.scheduled_start_at && (
                    <p className="text-xs text-slate-500">
                      {formatDateTime(session.scheduled_start_at)} · {session.planned_minutes} min
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent recovery logs */}
      {recentRecovery.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">Recent Recovery</h3>
          <div className="grid gap-3">
            {recentRecovery.map((log) => (
              <div
                key={log.id}
                className="rounded-2xl border border-white/8 bg-slate-950/60 px-5 py-3"
              >
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                  {log.sleep_hours != null && (
                    <div>
                      <p className="text-xs text-slate-500">Sleep</p>
                      <p className="font-medium text-white">{log.sleep_hours}h</p>
                    </div>
                  )}
                  {log.soreness_level != null && (
                    <div>
                      <p className="text-xs text-slate-500">Soreness</p>
                      <p className="font-medium text-white">{log.soreness_level}/10</p>
                    </div>
                  )}
                  {log.energy_level != null && (
                    <div>
                      <p className="text-xs text-slate-500">Energy</p>
                      <p className="font-medium text-white">{log.energy_level}/10</p>
                    </div>
                  )}
                  {log.stress_level != null && (
                    <div>
                      <p className="text-xs text-slate-500">Stress</p>
                      <p className="font-medium text-white">{log.stress_level}/10</p>
                    </div>
                  )}
                </div>
                {log.notes && <p className="mt-2 text-xs text-slate-500">{log.notes}</p>}
                <p className="mt-2 text-xs text-slate-600">{formatDateTime(log.logged_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {healthData.sessions.length === 0 && healthData.recoveryLogs.length === 0 && !healthData.profile && (
        <EmptyState
          title="No health data yet"
          description="Use the AI command above to log a workout, set up your profile, or generate a weekly plan."
        />
      )}

      {/* Advanced — manual CRUD */}
      <AdvancedSection title="Advanced — Manual Controls">
        {/* Profile */}
        <FormCard
          badge="Profile"
          title={profileExists ? "Update health profile" : "Create health profile"}
          description="Single profile per user. Updates reuse the same endpoint."
        >
          <form
            className="space-y-4"
            onSubmit={(e) =>
              void (async () => {
                e.preventDefault();
                await runAction("profile", async () => {
                  const payload = {
                    primary_goal: currentProfileForm.primaryGoal,
                    fitness_level: currentProfileForm.fitnessLevel,
                    preferred_workout_time: currentProfileForm.preferredWorkoutTime || undefined,
                    weekly_workout_target: Number(currentProfileForm.weeklyWorkoutTarget),
                    minimum_session_minutes: Number(currentProfileForm.minimumSessionMinutes),
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
                  onChange={(e) => updateProfileForm({ primaryGoal: e.target.value })}
                />
              </Field>
              <Field label="Fitness level">
                <Select
                  value={currentProfileForm.fitnessLevel}
                  onChange={(e) => updateProfileForm({ fitnessLevel: e.target.value })}
                >
                  {["beginner", "intermediate", "advanced"].map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Weekly workout target">
                <Input
                  type="number"
                  value={currentProfileForm.weeklyWorkoutTarget}
                  onChange={(e) => updateProfileForm({ weeklyWorkoutTarget: e.target.value })}
                />
              </Field>
              <Field label="Preferred time">
                <Input
                  value={currentProfileForm.preferredWorkoutTime}
                  onChange={(e) => updateProfileForm({ preferredWorkoutTime: e.target.value })}
                />
              </Field>
            </div>
            <Button type="submit" disabled={submitting === "profile"}>
              {submitting === "profile" ? "Saving…" : profileExists ? "Update Profile" : "Create Profile"}
            </Button>
          </form>
          {healthData.profile && (
            <KeyValueList
              items={[
                { label: "Primary goal", value: healthData.profile.primary_goal },
                { label: "Fitness level", value: healthData.profile.fitness_level },
                { label: "Workout target", value: `${healthData.profile.weekly_workout_target} sessions` },
                { label: "Preferred time", value: healthData.profile.preferred_workout_time ?? "Not set" },
              ]}
            />
          )}
        </FormCard>

        {/* Workout preferences */}
        <FormCard badge="Preferences" title="Add workout preference" description="Define preferred workout types and recovery gaps.">
          <form
            className="space-y-4"
            onSubmit={(e) =>
              void (async () => {
                e.preventDefault();
                await runAction("preference", async () => {
                  await healthRoutineApi.createPreference({
                    workout_type: preferenceForm.workoutType,
                    priority: Number(preferenceForm.priority),
                    minimum_gap_hours: Number(preferenceForm.minimumGapHours),
                    recovery_window_hours: Number(preferenceForm.recoveryWindowHours),
                    is_active: preferenceForm.isActive === "true",
                  });
                  setPreferenceForm({ workoutType: "strength_training", priority: "5", minimumGapHours: "24", recoveryWindowHours: "24", isActive: "true" });
                });
              })()
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Workout type">
                <Input value={preferenceForm.workoutType} onChange={(e) => setPreferenceForm({ ...preferenceForm, workoutType: e.target.value })} />
              </Field>
              <Field label="Priority">
                <Input type="number" value={preferenceForm.priority} onChange={(e) => setPreferenceForm({ ...preferenceForm, priority: e.target.value })} />
              </Field>
              <Field label="Minimum gap hours">
                <Input type="number" value={preferenceForm.minimumGapHours} onChange={(e) => setPreferenceForm({ ...preferenceForm, minimumGapHours: e.target.value })} />
              </Field>
              <Field label="Recovery window hours">
                <Input type="number" value={preferenceForm.recoveryWindowHours} onChange={(e) => setPreferenceForm({ ...preferenceForm, recoveryWindowHours: e.target.value })} />
              </Field>
            </div>
            <Button type="submit" disabled={submitting === "preference"}>
              {submitting === "preference" ? "Saving…" : "Add Preference"}
            </Button>
          </form>
        </FormCard>

        {/* Log recovery */}
        <FormCard badge="Recovery" title="Log recovery" description="Track recovery inputs that feed score calculation.">
          <form
            className="space-y-4"
            onSubmit={(e) =>
              void (async () => {
                e.preventDefault();
                await runAction("recovery", async () => {
                  await healthRoutineApi.createRecoveryLog({
                    sleep_hours: recoveryForm.sleepHours ? Number(recoveryForm.sleepHours) : undefined,
                    soreness_level: recoveryForm.sorenessLevel ? Number(recoveryForm.sorenessLevel) : undefined,
                    stress_level: recoveryForm.stressLevel ? Number(recoveryForm.stressLevel) : undefined,
                    hydration_level: recoveryForm.hydrationLevel ? Number(recoveryForm.hydrationLevel) : undefined,
                    energy_level: recoveryForm.energyLevel ? Number(recoveryForm.energyLevel) : undefined,
                    notes: recoveryForm.notes || undefined,
                  });
                  setRecoveryForm({ sleepHours: "", sorenessLevel: "", stressLevel: "", hydrationLevel: "", energyLevel: "", notes: "" });
                });
              })()
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Sleep hours">
                <Input type="number" value={recoveryForm.sleepHours} onChange={(e) => setRecoveryForm({ ...recoveryForm, sleepHours: e.target.value })} />
              </Field>
              <Field label="Soreness (1–10)">
                <Input type="number" value={recoveryForm.sorenessLevel} onChange={(e) => setRecoveryForm({ ...recoveryForm, sorenessLevel: e.target.value })} />
              </Field>
              <Field label="Energy (1–10)">
                <Input type="number" value={recoveryForm.energyLevel} onChange={(e) => setRecoveryForm({ ...recoveryForm, energyLevel: e.target.value })} />
              </Field>
              <Field label="Stress (1–10)">
                <Input type="number" value={recoveryForm.stressLevel} onChange={(e) => setRecoveryForm({ ...recoveryForm, stressLevel: e.target.value })} />
              </Field>
            </div>
            <Field label="Notes">
              <Textarea value={recoveryForm.notes} onChange={(e) => setRecoveryForm({ ...recoveryForm, notes: e.target.value })} />
            </Field>
            <Button type="submit" disabled={submitting === "recovery"}>
              {submitting === "recovery" ? "Saving…" : "Log Recovery"}
            </Button>
          </form>
        </FormCard>

        {/* Manual session */}
        <FormCard badge="Sessions" title="Create session manually" description="Schedule a specific workout session.">
          <form
            className="space-y-4"
            onSubmit={(e) =>
              void (async () => {
                e.preventDefault();
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
                    workoutType: "strength_training", title: "", scheduledStartAt: "", scheduledEndAt: "",
                    plannedMinutes: "45", intensity: "medium", status: "planned", notes: "",
                  });
                });
              })()
            }
          >
            <Field label="Title">
              <Input value={sessionForm.title} onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Workout type">
                <Input value={sessionForm.workoutType} onChange={(e) => setSessionForm({ ...sessionForm, workoutType: e.target.value })} />
              </Field>
              <Field label="Intensity">
                <Select value={sessionForm.intensity} onChange={(e) => setSessionForm({ ...sessionForm, intensity: e.target.value })}>
                  {["low", "medium", "high"].map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </Field>
              <Field label="Scheduled start">
                <Input type="datetime-local" value={sessionForm.scheduledStartAt} onChange={(e) => setSessionForm({ ...sessionForm, scheduledStartAt: e.target.value })} />
              </Field>
              <Field label="Planned minutes">
                <Input type="number" value={sessionForm.plannedMinutes} onChange={(e) => setSessionForm({ ...sessionForm, plannedMinutes: e.target.value })} />
              </Field>
            </div>
            <Button type="submit" disabled={submitting === "session"}>
              {submitting === "session" ? "Creating…" : "Create Session"}
            </Button>
          </form>
        </FormCard>
      </AdvancedSection>
    </div>
  );
}
