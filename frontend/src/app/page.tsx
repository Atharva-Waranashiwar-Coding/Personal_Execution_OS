"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Task = {
  id: number;
  title: string;
  status: string;
  scheduled_for?: string | null;
  due_at?: string | null;
};

type Plan = {
  id: number;
  title: string;
  status: string;
  start_at?: string | null;
  end_at?: string | null;
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
};

export default function Home() {
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [todayPlans, setTodayPlans] = useState<Plan[]>([]);
  const [weeklyTasks, setWeeklyTasks] = useState<Task[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const today = await apiFetch("/views/today");
        const weekly = await apiFetch("/views/weekly");
        const pendingApprovals = await apiFetch("/approvals/pending");
        const analyticsSummary = await apiFetch("/analytics/summary");

        setTodayTasks(today.tasks || []);
        setTodayPlans(today.plans || []);
        setWeeklyTasks(weekly.tasks || []);
        setApprovals(pendingApprovals || []);
        setAnalytics(analyticsSummary);
      } catch {
        setError("Could not load dashboard. Login first.");
      }
    }

    loadDashboard();
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Personal Execution OS</h1>
          <a href="/login" className="underline text-neutral-300">
            Login
          </a>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-700 bg-red-950/30 p-4 mb-6">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
            <h2 className="text-xl font-semibold mb-2">Plan Adherence</h2>
            <p className="text-3xl font-bold">
              {analytics ? `${analytics.plan_adherence_rate}%` : "-"}
            </p>
          </section>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="rounded-2xl border border-neutral-800 p-6">
            <h2 className="text-2xl font-semibold mb-4">Today Tasks</h2>
            <div className="space-y-3">
              {todayTasks.map((task) => (
                <div key={task.id} className="rounded-lg bg-neutral-900 p-3">
                  <p className="font-medium">{task.title}</p>
                  <p className="text-sm text-neutral-400">{task.status}</p>
                </div>
              ))}
              {todayTasks.length === 0 ? (
                <p className="text-neutral-400">No tasks for today.</p>
              ) : null}
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
              {todayPlans.length === 0 ? (
                <p className="text-neutral-400">No plans for today.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-800 p-6">
            <h2 className="text-2xl font-semibold mb-4">Weekly Tasks</h2>
            <div className="space-y-3">
              {weeklyTasks.map((task) => (
                <div key={task.id} className="rounded-lg bg-neutral-900 p-3">
                  <p className="font-medium">{task.title}</p>
                  <p className="text-sm text-neutral-400">{task.status}</p>
                </div>
              ))}
              {weeklyTasks.length === 0 ? (
                <p className="text-neutral-400">No weekly tasks.</p>
              ) : null}
            </div>
          </section>

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
              {approvals.length === 0 ? (
                <p className="text-neutral-400">No pending approvals.</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}