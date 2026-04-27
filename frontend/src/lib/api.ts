import { getStoredToken } from "@/lib/auth";
import type {
  AICommandCreate,
  AICommandResponse,
  AICommandRevise,
} from "@/types/ai";
import type {
  AnalyticsSummaryResponse,
  Approval,
  ApprovalCreate,
  ApprovalResolve,
  CalendarEventSnapshot,
  CalendarSyncResponse,
  CalendarWriteApprovedResponse,
  CalendarWriteRequest,
  CalendarWriteRequestResponse,
  Company,
  CompanyCreate,
  CreateCountResponse,
  CreateTaskFromGmailActionItemResponse,
  DemoSeedResponse,
  FinalAnalyticsResponse,
  FollowUp,
  FollowUpCreate,
  FollowUpUpdate,
  GeneratePlanResponse,
  GenerateWorkoutRequest,
  GmailActionItem,
  GmailSyncResponse,
  Goal,
  GoalCreate,
  GoalUpdate,
  GoogleAuthUrlResponse,
  GoogleCallbackResponse,
  HealthCheckResponse,
  HealthInsightResponse,
  HealthProfile,
  HealthProfileCreate,
  HealthProfileUpdate,
  HealthRecommendation,
  IntegrationSyncLog,
  Interview,
  InterviewCreate,
  InterviewTrack,
  InterviewTrackCreate,
  InterviewUpdate,
  JobApplication,
  JobApplicationCreate,
  JobApplicationUpdate,
  JobInsightResponse,
  JobPosting,
  JobPostingCreate,
  LifeAdminCapture,
  LifeAdminCaptureCreate,
  LifeAdminItem,
  LifeAdminItemCreate,
  LifeAdminItemUpdate,
  LifeAdminRecurrence,
  LifeAdminRecurrenceCreate,
  NotificationHistory,
  Plan,
  PlanBrief,
  PlanCreate,
  PlanFeedback,
  PlanFeedbackCreate,
  PlanUpdate,
  PromptRunLog,
  RecoveryLog,
  RecoveryLogCreate,
  ResumeVariant,
  ResumeVariantCreate,
  SentCountResponse,
  StudyGenerateSessionsParams,
  StudyInsightResponse,
  StudySession,
  StudySessionCreate,
  StudySessionUpdate,
  StudySubtopic,
  StudySubtopicCreate,
  StudySubtopicUpdate,
  StudyTopic,
  StudyTopicCreate,
  StudyTopicUpdate,
  Task,
  TaskCreate,
  TaskUpdate,
  TodayViewResponse,
  TokenResponse,
  UserLogin,
  UserRegister,
  WeeklyViewResponse,
  WorkoutPreference,
  WorkoutPreferenceCreate,
  WorkoutSession,
  WorkoutSessionCreate,
  WorkoutSessionUpdate,
} from "@/lib/types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: BodyInit | object | null;
  token?: string | null;
}

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function getErrorText(payload: unknown, fallback: string) {
  if (!payload) {
    return fallback;
  }

  if (typeof payload === "string") {
    return payload;
  }

  if (typeof payload === "object") {
    const data = payload as Record<string, unknown>;
    const detail = data.detail;
    if (typeof detail === "string") {
      return detail;
    }

    const message = data.message;
    if (typeof message === "string") {
      return message;
    }
  }

  return fallback;
}

function withQuery(
  path: string,
  query: Record<string, string | number | boolean | null | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    params.set(key, String(value));
  }

  const serialized = params.toString();
  return serialized ? `${path}?${serialized}` : path;
}

async function parseResponsePayload(response: Response) {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}) {
  const headers = new Headers(options.headers);
  const token = options.token ?? getStoredToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let body: BodyInit | undefined;

  if (options.body instanceof FormData || typeof options.body === "string") {
    body = options.body;
  } else if (options.body !== undefined && options.body !== null) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    body,
    cache: "no-store",
    headers,
  });

  const payload = await parseResponsePayload(response);

  if (!response.ok) {
    throw new ApiError(
      getErrorText(payload, `Request failed with status ${response.status}`),
      response.status,
      payload,
    );
  }

  return payload as T;
}

export const healthApi = {
  check: () => apiFetch<HealthCheckResponse>("/health"),
};

export const authApi = {
  register: (payload: UserRegister) =>
    apiFetch<TokenResponse>("/auth/register", {
      method: "POST",
      body: payload,
    }),
  login: (payload: UserLogin) =>
    apiFetch<TokenResponse>("/auth/login", {
      method: "POST",
      body: payload,
    }),
};

export const goalsApi = {
  list: () => apiFetch<Goal[]>("/goals"),
  get: (goalId: number) => apiFetch<Goal>(`/goals/${goalId}`),
  create: (payload: GoalCreate) =>
    apiFetch<Goal>("/goals", {
      method: "POST",
      body: payload,
    }),
  update: (goalId: number, payload: GoalUpdate) =>
    apiFetch<Goal>(`/goals/${goalId}`, {
      method: "PUT",
      body: payload,
    }),
  remove: (goalId: number) =>
    apiFetch<void>(`/goals/${goalId}`, {
      method: "DELETE",
    }),
};

export const tasksApi = {
  list: () => apiFetch<Task[]>("/tasks"),
  get: (taskId: number) => apiFetch<Task>(`/tasks/${taskId}`),
  create: (payload: TaskCreate) =>
    apiFetch<Task>("/tasks", {
      method: "POST",
      body: payload,
    }),
  update: (taskId: number, payload: TaskUpdate) =>
    apiFetch<Task>(`/tasks/${taskId}`, {
      method: "PUT",
      body: payload,
    }),
  remove: (taskId: number) =>
    apiFetch<void>(`/tasks/${taskId}`, {
      method: "DELETE",
    }),
};

export const plansApi = {
  list: () => apiFetch<Plan[]>("/plans"),
  get: (planId: number) => apiFetch<Plan>(`/plans/${planId}`),
  create: (payload: PlanCreate) =>
    apiFetch<Plan>("/plans", {
      method: "POST",
      body: payload,
    }),
  update: (planId: number, payload: PlanUpdate) =>
    apiFetch<Plan>(`/plans/${planId}`, {
      method: "PUT",
      body: payload,
    }),
  remove: (planId: number) =>
    apiFetch<void>(`/plans/${planId}`, {
      method: "DELETE",
    }),
};

export const viewsApi = {
  today: () => apiFetch<TodayViewResponse>("/views/today"),
  weekly: () => apiFetch<WeeklyViewResponse>("/views/weekly"),
};

export const approvalsApi = {
  list: () => apiFetch<Approval[]>("/approvals"),
  listPending: () => apiFetch<Approval[]>("/approvals/pending"),
  create: (payload: ApprovalCreate) =>
    apiFetch<Approval>("/approvals", {
      method: "POST",
      body: payload,
    }),
  resolve: (approvalId: number, payload: ApprovalResolve) =>
    apiFetch<Approval>(`/approvals/${approvalId}/resolve`, {
      method: "PATCH",
      body: payload,
    }),
};

export const notificationsApi = {
  listHistory: () => apiFetch<NotificationHistory[]>("/notifications/history"),
};

export const analyticsApi = {
  summary: () => apiFetch<AnalyticsSummaryResponse>("/analytics/summary"),
};

export const finalAnalyticsApi = {
  summary: () => apiFetch<FinalAnalyticsResponse>("/final-analytics/summary"),
};

export const orchestratorApi = {
  generate: () =>
    apiFetch<GeneratePlanResponse>("/orchestrator/generate", {
      method: "POST",
    }),
  listBriefs: () => apiFetch<PlanBrief[]>("/orchestrator/briefs"),
  getBrief: (briefId: number) => apiFetch<PlanBrief>(`/orchestrator/briefs/${briefId}`),
  feedback: (planItemId: number, payload: PlanFeedbackCreate) =>
    apiFetch<PlanFeedback>(`/orchestrator/items/${planItemId}/feedback`, {
      method: "POST",
      body: payload,
    }),
};

export const studyApi = {
  createTrack: (payload: InterviewTrackCreate) =>
    apiFetch<InterviewTrack>("/study/tracks", {
      method: "POST",
      body: payload,
    }),
  listTracks: () => apiFetch<InterviewTrack[]>("/study/tracks"),
  createTopic: (payload: StudyTopicCreate) =>
    apiFetch<StudyTopic>("/study/topics", {
      method: "POST",
      body: payload,
    }),
  listTopics: () => apiFetch<StudyTopic[]>("/study/topics"),
  updateTopic: (topicId: number, payload: StudyTopicUpdate) =>
    apiFetch<StudyTopic>(`/study/topics/${topicId}`, {
      method: "PUT",
      body: payload,
    }),
  createSubtopic: (payload: StudySubtopicCreate) =>
    apiFetch<StudySubtopic>("/study/subtopics", {
      method: "POST",
      body: payload,
    }),
  listSubtopics: () => apiFetch<StudySubtopic[]>("/study/subtopics"),
  updateSubtopic: (subtopicId: number, payload: StudySubtopicUpdate) =>
    apiFetch<StudySubtopic>(`/study/subtopics/${subtopicId}`, {
      method: "PUT",
      body: payload,
    }),
  createSession: (payload: StudySessionCreate) =>
    apiFetch<StudySession>("/study/sessions", {
      method: "POST",
      body: payload,
    }),
  listSessions: () => apiFetch<StudySession[]>("/study/sessions"),
  updateSession: (sessionId: number, payload: StudySessionUpdate) =>
    apiFetch<StudySession>(`/study/sessions/${sessionId}`, {
      method: "PUT",
      body: payload,
    }),
  generateSessions: (params: StudyGenerateSessionsParams) =>
    apiFetch<StudySession[]>(
      withQuery("/study/sessions/generate", {
        energy_preference: params.energy_preference ?? "medium",
        available_hours: params.available_hours ?? 3,
      }),
      {
        method: "POST",
      },
    ),
  recoverMissedSessions: () =>
    apiFetch<StudySession[]>("/study/sessions/recover-missed", {
      method: "POST",
    }),
  completeSession: (sessionId: number, actualMinutes = 60) =>
    apiFetch<StudySession>(
      withQuery(`/study/sessions/${sessionId}/complete`, {
        actual_minutes: actualMinutes,
      }),
      {
        method: "POST",
      },
    ),
  insights: () => apiFetch<StudyInsightResponse>("/study/insights"),
};

export const lifeAdminApi = {
  createItem: (payload: LifeAdminItemCreate) =>
    apiFetch<LifeAdminItem>("/life-admin/items", {
      method: "POST",
      body: payload,
    }),
  listItems: () => apiFetch<LifeAdminItem[]>("/life-admin/items"),
  updateItem: (itemId: number, payload: LifeAdminItemUpdate) =>
    apiFetch<LifeAdminItem>(`/life-admin/items/${itemId}`, {
      method: "PUT",
      body: payload,
    }),
  createRecurrence: (payload: LifeAdminRecurrenceCreate) =>
    apiFetch<LifeAdminRecurrence>("/life-admin/recurrences", {
      method: "POST",
      body: payload,
    }),
  listRecurrences: () => apiFetch<LifeAdminRecurrence[]>("/life-admin/recurrences"),
  capture: (payload: LifeAdminCaptureCreate) =>
    apiFetch<LifeAdminCapture>("/life-admin/capture", {
      method: "POST",
      body: payload,
    }),
  generateRecurrences: () =>
    apiFetch<LifeAdminItem[]>("/life-admin/recurrences/generate", {
      method: "POST",
    }),
  escalate: () =>
    apiFetch<LifeAdminItem[]>("/life-admin/escalate", {
      method: "POST",
    }),
  scheduleReminders: () =>
    apiFetch<CreateCountResponse>("/life-admin/reminders/schedule", {
      method: "POST",
    }),
  sendReminders: () =>
    apiFetch<SentCountResponse>("/life-admin/reminders/send", {
      method: "POST",
    }),
};

export const jobApi = {
  createCompany: (payload: CompanyCreate) =>
    apiFetch<Company>("/job/companies", {
      method: "POST",
      body: payload,
    }),
  listCompanies: () => apiFetch<Company[]>("/job/companies"),
  createPosting: (payload: JobPostingCreate) =>
    apiFetch<JobPosting>("/job/postings", {
      method: "POST",
      body: payload,
    }),
  listPostings: () => apiFetch<JobPosting[]>("/job/postings"),
  createResume: (payload: ResumeVariantCreate) =>
    apiFetch<ResumeVariant>("/job/resumes", {
      method: "POST",
      body: payload,
    }),
  listResumes: () => apiFetch<ResumeVariant[]>("/job/resumes"),
  createApplication: (payload: JobApplicationCreate) =>
    apiFetch<JobApplication>("/job/applications", {
      method: "POST",
      body: payload,
    }),
  listApplications: () => apiFetch<JobApplication[]>("/job/applications"),
  updateApplication: (applicationId: number, payload: JobApplicationUpdate) =>
    apiFetch<JobApplication>(`/job/applications/${applicationId}`, {
      method: "PUT",
      body: payload,
    }),
  createInterview: (payload: InterviewCreate) =>
    apiFetch<Interview>("/job/interviews", {
      method: "POST",
      body: payload,
    }),
  listInterviews: () => apiFetch<Interview[]>("/job/interviews"),
  updateInterview: (interviewId: number, payload: InterviewUpdate) =>
    apiFetch<Interview>(`/job/interviews/${interviewId}`, {
      method: "PUT",
      body: payload,
    }),
  createFollowUp: (payload: FollowUpCreate) =>
    apiFetch<FollowUp>("/job/followups", {
      method: "POST",
      body: payload,
    }),
  listFollowUps: () => apiFetch<FollowUp[]>("/job/followups"),
  updateFollowUp: (followupId: number, payload: FollowUpUpdate) =>
    apiFetch<FollowUp>(`/job/followups/${followupId}`, {
      method: "PUT",
      body: payload,
    }),
  generateFollowUps: () =>
    apiFetch<CreateCountResponse>("/job/followups/generate", {
      method: "POST",
    }),
  generateInterviewPrep: (interviewId: number) =>
    apiFetch<CreateCountResponse>(`/job/interviews/${interviewId}/generate-prep`, {
      method: "POST",
    }),
  insights: () => apiFetch<JobInsightResponse>("/job/insights"),
};

export const healthRoutineApi = {
  createProfile: (payload: HealthProfileCreate) =>
    apiFetch<HealthProfile>("/health-routine/profile", {
      method: "POST",
      body: payload,
    }),
  getProfile: () => apiFetch<HealthProfile>("/health-routine/profile"),
  updateProfile: (payload: HealthProfileUpdate) =>
    apiFetch<HealthProfile>("/health-routine/profile", {
      method: "PUT",
      body: payload,
    }),
  createPreference: (payload: WorkoutPreferenceCreate) =>
    apiFetch<WorkoutPreference>("/health-routine/preferences", {
      method: "POST",
      body: payload,
    }),
  listPreferences: () => apiFetch<WorkoutPreference[]>("/health-routine/preferences"),
  createRecoveryLog: (payload: RecoveryLogCreate) =>
    apiFetch<RecoveryLog>("/health-routine/recovery", {
      method: "POST",
      body: payload,
    }),
  listRecoveryLogs: () => apiFetch<RecoveryLog[]>("/health-routine/recovery"),
  createSession: (payload: WorkoutSessionCreate) =>
    apiFetch<WorkoutSession>("/health-routine/sessions", {
      method: "POST",
      body: payload,
    }),
  listSessions: () => apiFetch<WorkoutSession[]>("/health-routine/sessions"),
  updateSession: (sessionId: number, payload: WorkoutSessionUpdate) =>
    apiFetch<WorkoutSession>(`/health-routine/sessions/${sessionId}`, {
      method: "PUT",
      body: payload,
    }),
  generateSession: (payload: GenerateWorkoutRequest) =>
    apiFetch<WorkoutSession>("/health-routine/sessions/generate", {
      method: "POST",
      body: payload,
    }),
  listRecommendations: () =>
    apiFetch<HealthRecommendation[]>("/health-routine/recommendations"),
  insights: () => apiFetch<HealthInsightResponse>("/health-routine/insights"),
};

export const integrationsApi = {
  getGoogleAuthUrl: () =>
    apiFetch<GoogleAuthUrlResponse>("/integrations/google/auth-url"),
  googleCallback: (code: string, state: string) =>
    apiFetch<GoogleCallbackResponse>(
      withQuery("/integrations/google/callback", {
        code,
        state,
      }),
    ),
  syncCalendar: () =>
    apiFetch<CalendarSyncResponse>("/integrations/calendar/sync", {
      method: "POST",
    }),
  listCalendarEvents: () =>
    apiFetch<CalendarEventSnapshot[]>("/integrations/calendar/events"),
  requestCalendarWrite: (payload: CalendarWriteRequest) =>
    apiFetch<CalendarWriteRequestResponse>("/integrations/calendar/write-request", {
      method: "POST",
      body: payload,
    }),
  writeApprovedCalendarEvent: (approvalId: number) =>
    apiFetch<CalendarWriteApprovedResponse>(
      `/integrations/calendar/write-approved/${approvalId}`,
      {
        method: "POST",
      },
    ),
  syncGmail: () =>
    apiFetch<GmailSyncResponse>("/integrations/gmail/sync", {
      method: "POST",
    }),
  listGmailActionItems: () =>
    apiFetch<GmailActionItem[]>("/integrations/gmail/action-items"),
  createTaskFromGmailActionItem: (itemId: number) =>
    apiFetch<CreateTaskFromGmailActionItemResponse>(
      `/integrations/gmail/action-items/${itemId}/create-task`,
      {
        method: "POST",
      },
    ),
  listSyncLogs: () => apiFetch<IntegrationSyncLog[]>("/integrations/sync-logs"),
  listPromptLogs: () => apiFetch<PromptRunLog[]>("/integrations/prompt-logs"),
};

export const demoApi = {
  seed: () =>
    apiFetch<DemoSeedResponse>("/demo/seed", {
      method: "POST",
    }),
};

export const aiApi = {
  command: (payload: AICommandCreate) =>
    apiFetch<AICommandResponse>("/ai/command", {
      method: "POST",
      body: payload,
    }),
  listCommands: () => apiFetch<AICommandResponse[]>("/ai/commands"),
  getCommand: (commandId: number) =>
    apiFetch<AICommandResponse>(`/ai/commands/${commandId}`),
  revise: (commandId: number, payload: AICommandRevise) =>
    apiFetch<AICommandResponse>(`/ai/commands/${commandId}/revise`, {
      method: "POST",
      body: payload,
    }),
};
