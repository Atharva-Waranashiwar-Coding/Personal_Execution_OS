"use client";

import { useEffect, useState } from "react";
import { apiFetch, API_BASE_URL } from "@/lib/api";

type Task = {
  id: number;
  title: string;
  status: string;
};

type Plan = {
  id: number;
  title: string;
  status: string;
};

type Approval = {
  id: number;
  title: string;
  status: string;
  action_type: string;
};

type Analytics = {
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
};

type GeneratedPlanItem = {
  id: number;
  source_agent: string;
  item_type: string;
  title: string;
  description?: string | null;
  final_score: number;
  status: string;
  reasoning?: string | null;
};

type PlanBrief = {
  id: number;
  summary: string;
  items: GeneratedPlanItem[];
};

type StudyInsight = {
  next_best_topic: string | null;
  next_best_subtopic: string | null;
  estimated_weekly_coverage_minutes: number;
  pending_sessions: number;
  missed_sessions: number;
  current_streak_days: number;
  longest_streak_days: number;
};

export default function Home() {
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [todayPlans, setTodayPlans] = useState<Plan[]>([]);
  const [weeklyTasks, setWeeklyTasks] = useState<Task[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [latestBrief, setLatestBrief] = useState<PlanBrief | null>(null);
  const [error, setError] = useState("");
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [studyInsights, setStudyInsights] = useState<StudyInsight | null>(null);

  async function loadDashboard() {
    try {
      const today = await apiFetch("/views/today");
      const weekly = await apiFetch("/views/weekly");
      const pendingApprovals = await apiFetch("/approvals/pending");
      const analyticsSummary = await apiFetch("/analytics/summary");
      const briefs = await apiFetch("/orchestrator/briefs");
      const studyInsightsData = await apiFetch("/study/insights");

      setTodayTasks(today.tasks || []);
      setTodayPlans(today.plans || []);
      setWeeklyTasks(weekly.tasks || []);
      setApprovals(pendingApprovals || []);
      setAnalytics(analyticsSummary);
      setLatestBrief((briefs || []).length > 0 ? briefs[0] : null);
      setStudyInsights(studyInsightsData);
      setError("");
    } catch {
      setError("Could not load dashboard. Login first.");
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleGeneratePlan() {
    try {
      setLoadingPlan(true);
      await apiFetch("/orchestrator/generate", {
        method: "POST",
      });
      await loadDashboard();
    } catch {
      setError("Failed to generate plan.");
    } finally {
      setLoadingPlan(false);
    }
  }

  async function handleFeedback(planItemId: number, feedbackType: string) {
    try {
      await apiFetch(`/orchestrator/items/${planItemId}/feedback`, {
        method: "POST",
        body: JSON.stringify({
          feedback_type: feedbackType,
        }),
      });
      await loadDashboard();
    } catch {
      setError("Failed to send feedback.");
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Personal Execution OS</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={handleGeneratePlan}
              disabled={loadingPlan}
              className="rounded-lg bg-white text-black px-4 py-2 font-semibold disabled:opacity-50"
            >
              {loadingPlan ? "Generating..." : "Generate Plan"}
            </button>
            <a href="/login" className="underline text-neutral-300">
              Login
            </a>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-700 bg-red-950/30 p-4 mb-6">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <section className="rounded-2xl border border-neutral-800 p-6">
            <h2 className="text-xl font-semibold mb-2">Completion Rate</h2>
            <p className="text-3xl font-bold">
              {analytics ? `${analytics.completion_rate}%` : "-"}
            </p>
          </section>

          <section className="rounded-2xl border border-neutral-800 p-6">
            <h2 className="text-xl font-semibold mb-2">Overdue Tasks</h2>
            <p className="text-3xl font-bold">
              {analytics ? analytics.overdue_count : "-"}
            </p>
          </section>

          <section className="rounded-2xl border border-neutral-800 p-6">
            <h2 className="text-xl font-semibold mb-2">Generated Plans</h2>
            <p className="text-3xl font-bold">
              {analytics ? analytics.generated_plan_count : "-"}
            </p>
          </section>

          <section className="rounded-2xl border border-neutral-800 p-6">
            <h2 className="text-xl font-semibold mb-2">Useful Feedback</h2>
            <p className="text-3xl font-bold">
              {analytics ? analytics.useful_feedback_count : "-"}
            </p>
          </section>
        </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <section className="rounded-2xl border border-neutral-800 p-6">
            <h2 className="text-xl font-semibold mb-2">Next Best Topic</h2>
            <p className="text-lg font-medium">
              {studyInsights?.next_best_topic || "-"}
            </p>
          </section>

          <section className="rounded-2xl border border-neutral-800 p-6">
            <h2 className="text-xl font-semibold mb-2">Next Best Subtopic</h2>
            <p className="text-lg font-medium">
              {studyInsights?.next_best_subtopic || "-"}
            </p>
          </section>

          <section className="rounded-2xl border border-neutral-800 p-6">
            <h2 className="text-xl font-semibold mb-2">Weekly Coverage</h2>
            <p className="text-3xl font-bold">
              {studyInsights ? studyInsights.estimated_weekly_coverage_minutes : "-"}
            </p>
            <p className="text-sm text-neutral-400">minutes planned</p>
          </section>

          <section className="rounded-2xl border border-neutral-800 p-6">
            <h2 className="text-xl font-semibold mb-2">Study Streak</h2>
            <p className="text-3xl font-bold">
              {studyInsights ? studyInsights.current_streak_days : "-"}
            </p>
            <p className="text-sm text-neutral-400">current days</p>
          </section>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <section className="rounded-2xl border border-neutral-800 p-6">
            <h2 className="text-2xl font-semibold mb-4">Today Tasks</h2>
            <div className="space-y-3">
              {todayTasks.map((task) => (
                <div key={task.id} className="rounded-lg bg-neutral-900 p-3">
                  <p className="font-medium">{task.title}</p>
                  <p className="text-sm text-neutral-400">{task.status}</p>
                </div>
              ))}
              {todayTasks.length === 0 ? <p className="text-neutral-400">No tasks for today.</p> : null}
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-800 p-6">
            <h2 className="text-2xl font-semibold mb-4">Today Plans</h2>
            <div className="space-y-3">
              {todayPlans.map((plan) => (
                <div key={plan.id} className="rounded-lg bg-neutral-900 p-3">
                  <p className="font-medium">{plan.title}</p>
                  <p className="text-sm text-neutral-400">{plan.status}</p>
                </div>
              ))}
              {todayPlans.length === 0 ? <p className="text-neutral-400">No plans for today.</p> : null}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="rounded-2xl border border-neutral-800 p-6">
            <h2 className="text-2xl font-semibold mb-4">Pending Approvals</h2>
            <div className="space-y-3">
              {approvals.map((approval) => (
                <div key={approval.id} className="rounded-lg bg-neutral-900 p-3">
                  <p className="font-medium">{approval.title}</p>
                  <p className="text-sm text-neutral-400">
                    {approval.action_type} · {approval.status}
                  </p>
                </div>
              ))}
              {approvals.length === 0 ? <p className="text-neutral-400">No pending approvals.</p> : null}
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-800 p-6">
            <h2 className="text-2xl font-semibold mb-4">Latest Generated Brief</h2>
            {latestBrief ? (
              <div className="space-y-4">
                <p className="text-neutral-300">{latestBrief.summary}</p>

                {latestBrief.items.map((item) => (
                  <div key={item.id} className="rounded-lg bg-neutral-900 p-4">
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-neutral-400">
                      {item.source_agent} · score {item.final_score} · {item.status}
                    </p>
                    {item.reasoning ? (
                      <p className="text-sm text-neutral-300 mt-2">{item.reasoning}</p>
                    ) : null}

                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        onClick={() => handleFeedback(item.id, "useful")}
                        className="rounded bg-neutral-700 px-3 py-1 text-sm"
                      >
                        Useful
                      </button>
                      <button
                        onClick={() => handleFeedback(item.id, "ignored")}
                        className="rounded bg-neutral-700 px-3 py-1 text-sm"
                      >
                        Ignored
                      </button>
                      <button
                        onClick={() => handleFeedback(item.id, "unrealistic")}
                        className="rounded bg-neutral-700 px-3 py-1 text-sm"
                      >
                        Unrealistic
                      </button>
                      <button
                        onClick={() => handleFeedback(item.id, "completed")}
                        className="rounded bg-neutral-700 px-3 py-1 text-sm"
                      >
                        Completed
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-400">No generated brief yet.</p>
            )}
          </section>
        </div>

        <div className="rounded-2xl border border-neutral-800 p-6 mt-6">
          <h2 className="text-2xl font-semibold mb-4">Weekly Tasks</h2>
          <div className="space-y-3">
            {weeklyTasks.map((task) => (
              <div key={task.id} className="rounded-lg bg-neutral-900 p-3">
                <p className="font-medium">{task.title}</p>
                <p className="text-sm text-neutral-400">{task.status}</p>
              </div>
            ))}
            {weeklyTasks.length === 0 ? <p className="text-neutral-400">No weekly tasks.</p> : null}
          </div>
        </div>
      </div>
    </main>
  );
}