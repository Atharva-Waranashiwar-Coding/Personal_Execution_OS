export type DateTimeString = string;

export interface HealthCheckResponse {
  status: string;
}

export interface UserRegister {
  email: string;
  password: string;
  full_name?: string | null;
  timezone?: string;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface GoalCreate {
  title: string;
  description?: string | null;
  category?: string | null;
  status?: string;
  priority?: string;
  target_date?: DateTimeString | null;
}

export interface GoalUpdate {
  title?: string | null;
  description?: string | null;
  category?: string | null;
  status?: string | null;
  priority?: string | null;
  target_date?: DateTimeString | null;
  completed_at?: DateTimeString | null;
}

export interface Goal {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  priority: string;
  target_date: DateTimeString | null;
  completed_at: DateTimeString | null;
  created_at: DateTimeString;
  updated_at: DateTimeString;
}

export interface TaskCreate {
  title: string;
  description?: string | null;
  goal_id?: number | null;
  status?: string;
  priority?: string;
  due_at?: DateTimeString | null;
  scheduled_for?: DateTimeString | null;
  estimated_minutes?: number | null;
  is_recurring?: boolean;
  recurrence_rule?: string | null;
  reminder_offset_minutes?: number | null;
}

export interface TaskUpdate {
  title?: string | null;
  description?: string | null;
  goal_id?: number | null;
  status?: string | null;
  priority?: string | null;
  due_at?: DateTimeString | null;
  scheduled_for?: DateTimeString | null;
  estimated_minutes?: number | null;
  is_recurring?: boolean | null;
  recurrence_rule?: string | null;
  reminder_offset_minutes?: number | null;
  completed_at?: DateTimeString | null;
}

export interface Task {
  id: number;
  user_id: number;
  parent_task_id: number | null;
  title: string;
  description: string | null;
  goal_id: number | null;
  status: string;
  priority: string;
  due_at: DateTimeString | null;
  scheduled_for: DateTimeString | null;
  estimated_minutes: number | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  reminder_offset_minutes: number | null;
  completed_at: DateTimeString | null;
  created_at: DateTimeString;
  updated_at: DateTimeString;
}

export interface PlanCreate {
  plan_type?: string;
  title: string;
  content?: string | null;
  start_at?: DateTimeString | null;
  end_at?: DateTimeString | null;
  status?: string;
  adherence_status?: string | null;
}

export interface PlanUpdate {
  plan_type?: string | null;
  title?: string | null;
  content?: string | null;
  start_at?: DateTimeString | null;
  end_at?: DateTimeString | null;
  status?: string | null;
  adherence_status?: string | null;
}

export interface Plan {
  id: number;
  user_id: number;
  plan_type: string;
  title: string;
  content: string | null;
  start_at: DateTimeString | null;
  end_at: DateTimeString | null;
  status: string;
  adherence_status: string | null;
  created_at: DateTimeString;
  updated_at: DateTimeString;
}

export interface TodayViewResponse {
  tasks: Task[];
  plans: Plan[];
}

export interface WeeklyViewResponse {
  tasks: Task[];
  plans: Plan[];
}

export interface ApprovalCreate {
  action_type: string;
  title: string;
  description?: string | null;
  payload?: string | null;
}

export interface ApprovalResolve {
  status: "approved" | "rejected";
}

export interface Approval {
  id: number;
  user_id: number;
  action_type: string;
  title: string;
  description: string | null;
  status: string;
  payload: string | null;
  resolved_at: DateTimeString | null;
  created_at: DateTimeString;
  updated_at: DateTimeString;
}

export interface NotificationHistory {
  id: number;
  user_id: number;
  channel: string;
  notification_type: string;
  title: string;
  body: string | null;
  status: string;
  reference_type: string | null;
  reference_id: number | null;
  sent_at: DateTimeString;
}

export interface AnalyticsSummaryResponse {
  completion_rate: number;
  overdue_count: number;
  plan_adherence_rate: number;
  total_tasks: number;
  completed_tasks: number;
  generated_plan_count: number;
  useful_feedback_count: number;
  ignored_feedback_count: number;
  unrealistic_feedback_count: number;
  completed_feedback_count: number;
}

export interface FinalAnalyticsResponse {
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  generated_plans: number;
  total_plan_items: number;
  completed_plan_items: number;
  study_sessions_completed: number;
  job_active_applications: number;
  life_admin_urgent_items: number;
  health_weekly_workouts_completed: number;
  prompt_runs: number;
  total_estimated_llm_cost: number;
}

export interface GeneratedPlanItem {
  id: number;
  source_agent: string;
  item_type: string;
  title: string;
  description: string | null;
  recommended_start_at: DateTimeString | null;
  recommended_end_at: DateTimeString | null;
  priority_score: number;
  urgency_score: number;
  feasibility_score: number;
  final_score: number;
  rank_position: number | null;
  status: string;
  reference_type: string | null;
  reference_id: number | null;
  reasoning: string | null;
}

export interface PlanBrief {
  id: number;
  brief_date: DateTimeString;
  summary: string;
  context_snapshot: string | null;
  planning_notes: string | null;
  created_by: string;
  created_at: DateTimeString;
  items: GeneratedPlanItem[];
}

export interface GeneratePlanResponse {
  brief_id: number;
  summary: string;
  item_count: number;
}

export interface PlanFeedbackCreate {
  feedback_type: "useful" | "ignored" | "unrealistic" | "completed";
  note?: string | null;
}

export interface PlanFeedback {
  id: number;
  plan_item_id: number;
  user_id: number;
  feedback_type: string;
  note: string | null;
}

export interface InterviewTrackCreate {
  name: string;
  description?: string | null;
  target_role?: string | null;
  target_company?: string | null;
  status?: string;
}

export interface InterviewTrack {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  target_role: string | null;
  target_company: string | null;
  status: string;
}

export interface StudyTopicCreate {
  interview_track_id?: number | null;
  name: string;
  description?: string | null;
  difficulty?: string;
  status?: string;
  backlog_size?: number;
  priority_weight?: number;
  deadline_at?: DateTimeString | null;
  estimated_total_minutes?: number | null;
}

export interface StudyTopicUpdate {
  interview_track_id?: number | null;
  name?: string | null;
  description?: string | null;
  difficulty?: string | null;
  status?: string | null;
  backlog_size?: number | null;
  priority_weight?: number | null;
  deadline_at?: DateTimeString | null;
  estimated_total_minutes?: number | null;
  completed_minutes?: number | null;
}

export interface StudyTopic {
  id: number;
  user_id: number;
  interview_track_id: number | null;
  name: string;
  description: string | null;
  difficulty: string;
  status: string;
  backlog_size: number;
  priority_weight: number;
  deadline_at: DateTimeString | null;
  estimated_total_minutes: number | null;
  completed_minutes: number;
  created_at: DateTimeString;
  updated_at: DateTimeString;
}

export interface StudySubtopicCreate {
  topic_id: number;
  name: string;
  description?: string | null;
  difficulty?: string;
  status?: string;
  estimated_minutes?: number | null;
  is_high_priority?: boolean;
  deadline_at?: DateTimeString | null;
}

export interface StudySubtopicUpdate {
  name?: string | null;
  description?: string | null;
  difficulty?: string | null;
  status?: string | null;
  estimated_minutes?: number | null;
  completed_minutes?: number | null;
  is_high_priority?: boolean | null;
  deadline_at?: DateTimeString | null;
}

export interface StudySubtopic {
  id: number;
  user_id: number;
  topic_id: number;
  name: string;
  description: string | null;
  difficulty: string;
  status: string;
  estimated_minutes: number | null;
  completed_minutes: number;
  is_high_priority: boolean;
  deadline_at: DateTimeString | null;
  created_at: DateTimeString;
  updated_at: DateTimeString;
}

export interface StudySessionCreate {
  topic_id?: number | null;
  subtopic_id?: number | null;
  title: string;
  description?: string | null;
  scheduled_start_at: DateTimeString;
  scheduled_end_at: DateTimeString;
  planned_minutes: number;
  energy_preference?: string;
  session_type?: string;
}

export interface StudySessionUpdate {
  title?: string | null;
  description?: string | null;
  scheduled_start_at?: DateTimeString | null;
  scheduled_end_at?: DateTimeString | null;
  planned_minutes?: number | null;
  actual_minutes?: number | null;
  energy_preference?: string | null;
  session_type?: string | null;
  status?: string | null;
  carry_forward_count?: number | null;
  explanation_text?: string | null;
}

export interface StudySession {
  id: number;
  user_id: number;
  topic_id: number | null;
  subtopic_id: number | null;
  title: string;
  description: string | null;
  scheduled_start_at: DateTimeString;
  scheduled_end_at: DateTimeString;
  planned_minutes: number;
  actual_minutes: number | null;
  energy_preference: string;
  session_type: string;
  status: string;
  carry_forward_count: number;
  explanation_text: string | null;
}

export interface StudyGenerateSessionsParams {
  energy_preference?: string;
  available_hours?: number;
}

export interface StudyInsightResponse {
  next_best_topic: string | null;
  next_best_subtopic: string | null;
  estimated_weekly_coverage_minutes: number;
  pending_sessions: number;
  missed_sessions: number;
  current_streak_days: number;
  longest_streak_days: number;
}

export interface LifeAdminItemCreate {
  item_type: string;
  title: string;
  description?: string | null;
  status?: string;
  priority?: string;
  due_at?: DateTimeString | null;
  scheduled_for?: DateTimeString | null;
  is_recurring_template?: boolean;
  reminder_required?: boolean;
  source?: string;
}

export interface LifeAdminItemUpdate {
  item_type?: string | null;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  due_at?: DateTimeString | null;
  scheduled_for?: DateTimeString | null;
  completed_at?: DateTimeString | null;
  escalation_level?: number | null;
  reminder_required?: boolean | null;
}

export interface LifeAdminItem {
  id: number;
  user_id: number;
  item_type: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_at: DateTimeString | null;
  scheduled_for: DateTimeString | null;
  completed_at: DateTimeString | null;
  is_recurring_template: boolean;
  recurrence_parent_id: number | null;
  escalation_level: number;
  reminder_required: boolean;
  source: string;
}

export interface LifeAdminRecurrenceCreate {
  item_id: number;
  recurrence_rule: string;
  lead_time_days?: number;
  next_due_at?: DateTimeString | null;
}

export interface LifeAdminRecurrence {
  id: number;
  item_id: number;
  user_id: number;
  recurrence_rule: string;
  lead_time_days: number;
  last_generated_at: DateTimeString | null;
  next_due_at: DateTimeString | null;
}

export interface LifeAdminCaptureCreate {
  raw_text: string;
}

export interface LifeAdminCapture {
  id: number;
  user_id: number;
  raw_text: string;
  normalized_payload: string | null;
  status: string;
}

export interface LifeAdminInsightResponse {
  urgent_item_count: number;
  escalated_item_count: number;
  upcoming_bill_count: number;
  missed_admin_count: number;
  next_admin_item: string | null;
}

export interface CreateCountResponse {
  created_count: number;
}

export interface SentCountResponse {
  sent_count: number;
}

export interface CompanyCreate {
  name: string;
  industry?: string | null;
  website?: string | null;
}

export interface Company {
  id: number;
  name: string;
  industry: string | null;
  website: string | null;
  created_at: DateTimeString;
}

export interface JobPostingCreate {
  company_id: number;
  title: string;
  description?: string | null;
  location?: string | null;
  job_type?: string | null;
  posted_at?: DateTimeString | null;
  deadline_at?: DateTimeString | null;
}

export interface JobPosting {
  id: number;
  company_id: number;
  title: string;
  description: string | null;
  location: string | null;
  job_type: string | null;
  posted_at: DateTimeString | null;
  deadline_at: DateTimeString | null;
  created_at: DateTimeString;
}

export interface ResumeVariantCreate {
  name: string;
  focus_area: string;
  version?: string;
}

export interface ResumeVariant {
  id: number;
  user_id: number;
  name: string;
  focus_area: string;
  version: string;
  created_at: DateTimeString;
}

export interface JobApplicationCreate {
  company_id: number;
  job_posting_id: number;
  resume_variant_id: number;
  stage?: string;
  status?: string;
  notes?: string | null;
}

export interface JobApplicationUpdate {
  stage?: string | null;
  status?: string | null;
  resume_variant_id?: number | null;
  notes?: string | null;
  fit_score?: number | null;
}

export interface JobApplication {
  id: number;
  user_id: number;
  company_id: number;
  job_posting_id: number;
  resume_variant_id: number;
  stage: string;
  status: string;
  applied_at: DateTimeString;
  last_update_at: DateTimeString;
  fit_score: number;
  notes: string | null;
}

export interface InterviewCreate {
  application_id: number;
  interview_type: string;
  scheduled_at: DateTimeString;
  status?: string;
  preparation_status?: string;
}

export interface InterviewUpdate {
  interview_type?: string | null;
  scheduled_at?: DateTimeString | null;
  status?: string | null;
  preparation_status?: string | null;
}

export interface Interview {
  id: number;
  application_id: number;
  interview_type: string;
  scheduled_at: DateTimeString;
  status: string;
  preparation_status: string;
}

export interface FollowUpCreate {
  application_id: number;
  follow_up_at: DateTimeString;
  status?: string;
}

export interface FollowUpUpdate {
  follow_up_at?: DateTimeString | null;
  status?: string | null;
}

export interface FollowUp {
  id: number;
  application_id: number;
  follow_up_at: DateTimeString;
  status: string;
}

export interface JobInsightResponse {
  active_applications: number;
  stale_applications: number;
  upcoming_interviews: number;
  upcoming_deadlines: number;
  pending_followups: number;
  weekly_application_count: number;
  weekly_target_count: number;
  pipeline_health_score: number;
}

export interface HealthProfileCreate {
  primary_goal?: string;
  fitness_level?: string;
  preferred_workout_time?: string | null;
  weekly_workout_target?: number;
  minimum_session_minutes?: number;
  ideal_session_minutes?: number;
  notes?: string | null;
}

export interface HealthProfileUpdate {
  primary_goal?: string | null;
  fitness_level?: string | null;
  preferred_workout_time?: string | null;
  weekly_workout_target?: number | null;
  minimum_session_minutes?: number | null;
  ideal_session_minutes?: number | null;
  notes?: string | null;
}

export interface HealthProfile {
  id: number;
  user_id: number;
  primary_goal: string;
  fitness_level: string;
  preferred_workout_time: string | null;
  weekly_workout_target: number;
  minimum_session_minutes: number;
  ideal_session_minutes: number;
  notes: string | null;
}

export interface WorkoutPreferenceCreate {
  workout_type: string;
  priority?: number;
  minimum_gap_hours?: number;
  recovery_window_hours?: number;
  is_active?: boolean;
}

export interface WorkoutPreference {
  id: number;
  user_id: number;
  workout_type: string;
  priority: number;
  minimum_gap_hours: number;
  recovery_window_hours: number;
  is_active: boolean;
}

export interface RecoveryLogCreate {
  sleep_hours?: number | null;
  soreness_level?: number | null;
  stress_level?: number | null;
  hydration_level?: number | null;
  energy_level?: number | null;
  notes?: string | null;
}

export interface RecoveryLog {
  id: number;
  user_id: number;
  sleep_hours: number | null;
  soreness_level: number | null;
  stress_level: number | null;
  hydration_level: number | null;
  energy_level: number | null;
  recovery_score: number;
  notes: string | null;
  logged_at: DateTimeString;
}

export interface WorkoutSessionCreate {
  workout_type: string;
  title: string;
  scheduled_start_at?: DateTimeString | null;
  scheduled_end_at?: DateTimeString | null;
  planned_minutes: number;
  intensity?: string;
  status?: string;
  notes?: string | null;
}

export interface WorkoutSessionUpdate {
  workout_type?: string | null;
  title?: string | null;
  scheduled_start_at?: DateTimeString | null;
  scheduled_end_at?: DateTimeString | null;
  planned_minutes?: number | null;
  actual_minutes?: number | null;
  intensity?: string | null;
  status?: string | null;
  energy_before?: number | null;
  energy_after?: number | null;
  notes?: string | null;
}

export interface WorkoutSession {
  id: number;
  user_id: number;
  workout_type: string;
  title: string;
  scheduled_start_at: DateTimeString | null;
  scheduled_end_at: DateTimeString | null;
  planned_minutes: number;
  actual_minutes: number | null;
  intensity: string;
  status: string;
  energy_before: number | null;
  energy_after: number | null;
  notes: string | null;
}

export interface GenerateWorkoutRequest {
  available_minutes?: number;
  energy_level?: number;
}

export interface HealthRecommendation {
  id: number;
  user_id: number;
  recommendation_type: string;
  title: string;
  description: string | null;
  priority_score: number;
  status: string;
  reference_type: string | null;
  reference_id: number | null;
}

export interface HealthInsightResponse {
  recovery_score: number;
  recommended_action: string;
  weekly_workouts_completed: number;
  weekly_workout_target: number;
  pending_recommendations: number;
  last_workout_type: string | null;
}

export interface GoogleAuthUrlResponse {
  auth_url: string;
}

export interface GoogleCallbackResponse {
  status: string;
}

export interface CalendarSyncResponse {
  synced_count: number;
}

export interface CalendarEventSnapshot {
  id: number;
  external_event_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: DateTimeString;
  end_at: DateTimeString;
  source: string;
  synced_at: DateTimeString;
}

export interface CalendarWriteRequest {
  title: string;
  description?: string | null;
  start_at: DateTimeString;
  end_at: DateTimeString;
}

export interface CalendarWriteRequestResponse {
  approval_id: number;
  status: string;
}

export interface CalendarWriteApprovedResponse {
  external_event_id: string;
}

export interface GmailSyncResponse {
  extracted_count: number;
}

export interface GmailActionItem {
  id: number;
  gmail_message_id: string;
  sender: string | null;
  subject: string | null;
  snippet: string | null;
  extracted_title: string;
  extracted_description: string | null;
  detected_deadline_at: DateTimeString | null;
  status: string;
  approval_id: number | null;
}

export interface CreateTaskFromGmailActionItemResponse {
  task_id: number;
  status: string;
}

export interface IntegrationSyncLog {
  id: number;
  integration_type: string;
  status: string;
  records_processed: number;
  error_message: string | null;
  started_at: DateTimeString;
  finished_at: DateTimeString | null;
}

export interface PromptRunLog {
  id: number;
  feature_name: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number;
  status: string;
  error_message: string | null;
  created_at: DateTimeString;
}

export interface DemoSeedResponse {
  status: string;
  message?: string;
  [key: string]: unknown;
}
