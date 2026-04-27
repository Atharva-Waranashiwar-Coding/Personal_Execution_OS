"use client";

import { useMemo, useState } from "react";

import { jobApi } from "@/lib/api";
import { formatDateTime, formatNumber, toIsoString, toneFromStatus } from "@/lib/format";
import { settledValue } from "@/lib/request";
import type {
  Company,
  FollowUp,
  Interview,
  JobApplication,
  JobInsightResponse,
  JobPosting,
  ResumeVariant,
} from "@/lib/types";
import { useApiQuery } from "@/hooks/use-api-query";
import { Field, FormCard } from "@/components/page-elements";
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
  Table,
  Textarea,
} from "@/components/ui";

interface JobData {
  companies: Company[];
  postings: JobPosting[];
  resumes: ResumeVariant[];
  applications: JobApplication[];
  interviews: Interview[];
  followUps: FollowUp[];
  insights: JobInsightResponse | null;
}

async function loadJobData(): Promise<JobData> {
  const results = await Promise.allSettled([
    jobApi.listCompanies(),
    jobApi.listPostings(),
    jobApi.listResumes(),
    jobApi.listApplications(),
    jobApi.listInterviews(),
    jobApi.listFollowUps(),
    jobApi.insights(),
  ]);

  return {
    companies: settledValue(results[0], []),
    postings: settledValue(results[1], []),
    resumes: settledValue(results[2], []),
    applications: settledValue(results[3], []),
    interviews: settledValue(results[4], []),
    followUps: settledValue(results[5], []),
    insights: settledValue(results[6], null),
  };
}

const JOB_EXAMPLES = [
  "Research Google SWE L5 and add it to my pipeline.",
  "Generate follow-ups for stale applications.",
  "Prep talking points for my interview at Stripe tomorrow.",
];

const PIPELINE_STAGES = ["applied", "screen", "interview", "offer", "rejected"];

export function JobSearchPage() {
  const { data, error, loading, reload } = useApiQuery(loadJobData);
  const [companyForm, setCompanyForm] = useState({ name: "", industry: "", website: "" });
  const [postingForm, setPostingForm] = useState({
    companyId: "", title: "", description: "", location: "", jobType: "", postedAt: "", deadlineAt: "",
  });
  const [resumeForm, setResumeForm] = useState({ name: "", focusArea: "", version: "v1" });
  const [applicationForm, setApplicationForm] = useState({
    companyId: "", postingId: "", resumeId: "", stage: "applied", status: "active", notes: "",
  });
  const [interviewForm, setInterviewForm] = useState({
    applicationId: "", interviewType: "phone", scheduledAt: "", status: "scheduled", preparationStatus: "pending",
  });
  const [followUpForm, setFollowUpForm] = useState({
    applicationId: "", followUpAt: "", status: "pending",
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

  const companies = data?.companies ?? [];
  const postings = data?.postings ?? [];
  const resumes = data?.resumes ?? [];
  const applications = data?.applications ?? [];

  const companyLookup = useMemo(
    () => new Map((data?.companies ?? []).map((c) => [c.id, c])),
    [data?.companies],
  );
  const postingLookup = useMemo(
    () => new Map((data?.postings ?? []).map((p) => [p.id, p])),
    [data?.postings],
  );

  const upcomingInterviews = useMemo(
    () =>
      (data?.interviews ?? [])
        .filter((i) => i.status === "scheduled")
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
        .slice(0, 5),
    [data?.interviews],
  );

  const pendingFollowUps = useMemo(
    () =>
      (data?.followUps ?? [])
        .filter((f) => f.status === "pending")
        .sort((a, b) => new Date(a.follow_up_at).getTime() - new Date(b.follow_up_at).getTime())
        .slice(0, 5),
    [data?.followUps],
  );

  const pipelineByStage = useMemo(
    () =>
      PIPELINE_STAGES.map((stage) => ({
        stage,
        apps: (data?.applications ?? []).filter((a) => a.stage === stage && a.status === "active"),
      })).filter((s) => s.apps.length > 0),
    [data?.applications],
  );

  if (loading && !data) {
    return (
      <LoadingState
        title="Loading job search"
        description="Collecting companies, postings, applications, interviews, and follow-ups."
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Job Agent"
        title="Job Search"
        description="Tell the AI to research roles, generate follow-ups, and prep for interviews. Track your pipeline below."
        actions={
          <Button variant="secondary" size="sm" onClick={() => void reload()}>
            Refresh
          </Button>
        }
      />

      {error ? <ErrorState description={error} /> : null}

      {/* AI Command */}
      <AICommandBox
        placeholder="Research a company and add it to my pipeline, or generate follow-ups for stale applications."
        examples={JOB_EXAMPLES}
        onComplete={() => void reload()}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Applications"
          value={formatNumber(data?.insights?.active_applications)}
          hint="Currently active in pipeline"
          tone="success"
        />
        <StatCard
          label="Pipeline Health"
          value={data?.insights ? data.insights.pipeline_health_score.toFixed(1) : "—"}
          hint={`${formatNumber(data?.insights?.weekly_application_count)} this week`}
          tone="success"
        />
        <StatCard
          label="Upcoming Interviews"
          value={formatNumber(data?.insights?.upcoming_interviews)}
          hint="Scheduled interviews"
        />
        <StatCard
          label="Stale Applications"
          value={formatNumber(data?.insights?.stale_applications)}
          hint="Need follow-up or close"
          tone="warning"
        />
      </div>

      {/* AI actions row */}
      <div className="flex flex-wrap gap-3">
        <Button
          size="sm"
          variant="secondary"
          disabled={submitting === "generate-followups"}
          onClick={() =>
            void runAction("generate-followups", async () => {
              await jobApi.generateFollowUps();
              await reload();
            })
          }
        >
          {submitting === "generate-followups" ? "Generating…" : "Generate Follow-Ups"}
        </Button>
      </div>

      {/* Upcoming interviews */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-300">Upcoming Interviews</h3>
        {upcomingInterviews.length === 0 ? (
          <EmptyState
            title="No scheduled interviews"
            description="Ask the AI to add an interview or schedule one via Advanced below."
          />
        ) : (
          <div className="grid gap-3">
            {upcomingInterviews.map((interview) => {
              const app = applications.find((a) => a.id === interview.application_id);
              const company = app ? companyLookup.get(app.company_id) : undefined;
              const posting = app ? postingLookup.get(app.job_posting_id) : undefined;
              return (
                <div
                  key={interview.id}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-white/8 bg-slate-950/60 px-5 py-4"
                >
                  <div className="space-y-1.5">
                    <p className="font-medium text-white">
                      {company?.name ?? "Unknown Company"}{posting ? ` — ${posting.title}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{interview.interview_type}</Badge>
                      <Badge tone={toneFromStatus(interview.preparation_status)}>
                        prep: {interview.preparation_status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(interview.scheduled_at)}
                    </p>
                  </div>
                  <Badge tone={toneFromStatus(interview.status)}>{interview.status}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending follow-ups */}
      {pendingFollowUps.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">Pending Follow-Ups</h3>
          <div className="grid gap-3">
            {pendingFollowUps.map((fu) => {
              const app = applications.find((a) => a.id === fu.application_id);
              const company = app ? companyLookup.get(app.company_id) : undefined;
              return (
                <div
                  key={fu.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-slate-950/60 px-5 py-3"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-white">
                      {company?.name ?? `Application #${fu.application_id}`}
                    </p>
                    <p className="text-xs text-slate-500">Due {formatDateTime(fu.follow_up_at)}</p>
                  </div>
                  <Badge tone={toneFromStatus(fu.status)}>{fu.status}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pipeline by stage */}
      {pipelineByStage.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">Active Pipeline</h3>
          <div className="grid gap-3">
            {pipelineByStage.map(({ stage, apps }) => (
              <div key={stage} className="rounded-2xl border border-white/8 bg-slate-950/60 px-5 py-4">
                <div className="mb-3 flex items-center gap-3">
                  <Badge tone={stage === "offer" ? "success" : stage === "rejected" ? "danger" : "neutral"}>
                    {stage}
                  </Badge>
                  <span className="text-xs text-slate-500">{apps.length} application{apps.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="space-y-2">
                  {apps.map((app) => {
                    const company = companyLookup.get(app.company_id);
                    const posting = postingLookup.get(app.job_posting_id);
                    return (
                      <div key={app.id} className="flex items-center gap-3 text-sm">
                        <span className="font-medium text-white">
                          {company?.name ?? "Unknown"}
                        </span>
                        {posting && (
                          <span className="text-slate-500">· {posting.title}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {applications.length === 0 && upcomingInterviews.length === 0 && (
        <EmptyState
          title="No job search data yet"
          description="Use the AI command above to research roles, add companies, or kick off your job search pipeline."
        />
      )}

      {/* Advanced — manual CRUD */}
      <AdvancedSection title="Advanced — Manual Controls">
        {/* Add company */}
        <FormCard badge="Companies" title="Add company" description="Create a company once, then attach postings and applications.">
          <form
            className="space-y-4"
            onSubmit={(e) =>
              void (async () => {
                e.preventDefault();
                await runAction("company", async () => {
                  await jobApi.createCompany({
                    name: companyForm.name,
                    industry: companyForm.industry || undefined,
                    website: companyForm.website || undefined,
                  });
                  setCompanyForm({ name: "", industry: "", website: "" });
                });
              })()
            }
          >
            <Field label="Company name">
              <Input value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Industry">
                <Input value={companyForm.industry} onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })} />
              </Field>
              <Field label="Website">
                <Input value={companyForm.website} onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })} />
              </Field>
            </div>
            <Button type="submit" disabled={submitting === "company"}>
              {submitting === "company" ? "Saving…" : "Create Company"}
            </Button>
          </form>
        </FormCard>

        {/* Add posting */}
        <FormCard badge="Postings" title="Add posting" description="Attach a job posting to a company.">
          <form
            className="space-y-4"
            onSubmit={(e) =>
              void (async () => {
                e.preventDefault();
                await runAction("posting", async () => {
                  await jobApi.createPosting({
                    company_id: Number(postingForm.companyId),
                    title: postingForm.title,
                    description: postingForm.description || undefined,
                    location: postingForm.location || undefined,
                    job_type: postingForm.jobType || undefined,
                    posted_at: toIsoString(postingForm.postedAt),
                    deadline_at: toIsoString(postingForm.deadlineAt),
                  });
                  setPostingForm({ companyId: "", title: "", description: "", location: "", jobType: "", postedAt: "", deadlineAt: "" });
                });
              })()
            }
          >
            <Field label="Company">
              <Select
                value={postingForm.companyId}
                onChange={(e) => setPostingForm({ ...postingForm, companyId: e.target.value })}
                required
              >
                <option value="">Select company</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Job title">
              <Input value={postingForm.title} onChange={(e) => setPostingForm({ ...postingForm, title: e.target.value })} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Location">
                <Input value={postingForm.location} onChange={(e) => setPostingForm({ ...postingForm, location: e.target.value })} />
              </Field>
              <Field label="Job type">
                <Input value={postingForm.jobType} onChange={(e) => setPostingForm({ ...postingForm, jobType: e.target.value })} />
              </Field>
              <Field label="Deadline">
                <Input type="datetime-local" value={postingForm.deadlineAt} onChange={(e) => setPostingForm({ ...postingForm, deadlineAt: e.target.value })} />
              </Field>
            </div>
            <Button type="submit" disabled={submitting === "posting"}>
              {submitting === "posting" ? "Saving…" : "Create Posting"}
            </Button>
          </form>
        </FormCard>

        {/* Add resume variant */}
        <FormCard badge="Resumes" title="Add resume variant" description="Track resume versions for different roles.">
          <form
            className="space-y-4"
            onSubmit={(e) =>
              void (async () => {
                e.preventDefault();
                await runAction("resume", async () => {
                  await jobApi.createResume({ name: resumeForm.name, focus_area: resumeForm.focusArea, version: resumeForm.version });
                  setResumeForm({ name: "", focusArea: "", version: "v1" });
                });
              })()
            }
          >
            <Field label="Variant name">
              <Input value={resumeForm.name} onChange={(e) => setResumeForm({ ...resumeForm, name: e.target.value })} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Focus area">
                <Input value={resumeForm.focusArea} onChange={(e) => setResumeForm({ ...resumeForm, focusArea: e.target.value })} required />
              </Field>
              <Field label="Version">
                <Input value={resumeForm.version} onChange={(e) => setResumeForm({ ...resumeForm, version: e.target.value })} />
              </Field>
            </div>
            <Button type="submit" disabled={submitting === "resume"}>
              {submitting === "resume" ? "Saving…" : "Create Resume Variant"}
            </Button>
          </form>
        </FormCard>

        {/* Add application */}
        <FormCard badge="Applications" title="Add application" description="Create an application tied to a company, posting, and resume.">
          <form
            className="space-y-4"
            onSubmit={(e) =>
              void (async () => {
                e.preventDefault();
                await runAction("application", async () => {
                  await jobApi.createApplication({
                    company_id: Number(applicationForm.companyId),
                    job_posting_id: Number(applicationForm.postingId),
                    resume_variant_id: Number(applicationForm.resumeId),
                    stage: applicationForm.stage,
                    status: applicationForm.status,
                    notes: applicationForm.notes || undefined,
                  });
                  setApplicationForm({ companyId: "", postingId: "", resumeId: "", stage: "applied", status: "active", notes: "" });
                });
              })()
            }
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Company">
                <Select value={applicationForm.companyId} onChange={(e) => setApplicationForm({ ...applicationForm, companyId: e.target.value })} required>
                  <option value="">Select</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Posting">
                <Select value={applicationForm.postingId} onChange={(e) => setApplicationForm({ ...applicationForm, postingId: e.target.value })} required>
                  <option value="">Select</option>
                  {postings.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </Select>
              </Field>
              <Field label="Resume">
                <Select value={applicationForm.resumeId} onChange={(e) => setApplicationForm({ ...applicationForm, resumeId: e.target.value })} required>
                  <option value="">Select</option>
                  {resumes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Stage">
                <Select value={applicationForm.stage} onChange={(e) => setApplicationForm({ ...applicationForm, stage: e.target.value })}>
                  {["applied", "screen", "interview", "offer", "rejected"].map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </Field>
              <Field label="Status">
                <Select value={applicationForm.status} onChange={(e) => setApplicationForm({ ...applicationForm, status: e.target.value })}>
                  {["active", "paused", "closed"].map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Notes">
              <Textarea value={applicationForm.notes} onChange={(e) => setApplicationForm({ ...applicationForm, notes: e.target.value })} />
            </Field>
            <Button type="submit" disabled={submitting === "application"}>
              {submitting === "application" ? "Saving…" : "Create Application"}
            </Button>
          </form>
        </FormCard>

        {/* Add interview */}
        <FormCard badge="Interviews" title="Add interview" description="Capture interview schedule and prep status.">
          <form
            className="space-y-4"
            onSubmit={(e) =>
              void (async () => {
                e.preventDefault();
                await runAction("interview", async () => {
                  await jobApi.createInterview({
                    application_id: Number(interviewForm.applicationId),
                    interview_type: interviewForm.interviewType,
                    scheduled_at: toIsoString(interviewForm.scheduledAt) ?? "",
                    status: interviewForm.status,
                    preparation_status: interviewForm.preparationStatus,
                  });
                  setInterviewForm({ applicationId: "", interviewType: "phone", scheduledAt: "", status: "scheduled", preparationStatus: "pending" });
                });
              })()
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Application">
                <Select value={interviewForm.applicationId} onChange={(e) => setInterviewForm({ ...interviewForm, applicationId: e.target.value })} required>
                  <option value="">Select</option>
                  {applications.map((a) => (
                    <option key={a.id} value={a.id}>
                      #{a.id} · {companyLookup.get(a.company_id)?.name ?? "Company"}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Interview type">
                <Input value={interviewForm.interviewType} onChange={(e) => setInterviewForm({ ...interviewForm, interviewType: e.target.value })} />
              </Field>
              <Field label="Scheduled at">
                <Input type="datetime-local" value={interviewForm.scheduledAt} onChange={(e) => setInterviewForm({ ...interviewForm, scheduledAt: e.target.value })} required />
              </Field>
              <Field label="Preparation status">
                <Select value={interviewForm.preparationStatus} onChange={(e) => setInterviewForm({ ...interviewForm, preparationStatus: e.target.value })}>
                  {["pending", "in_progress", "completed"].map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </Field>
            </div>
            <Button type="submit" disabled={submitting === "interview"}>
              {submitting === "interview" ? "Saving…" : "Create Interview"}
            </Button>
          </form>
        </FormCard>

        {/* Add follow-up */}
        <FormCard badge="Follow-ups" title="Add follow-up" description="Schedule outreach for an application.">
          <form
            className="space-y-4"
            onSubmit={(e) =>
              void (async () => {
                e.preventDefault();
                await runAction("followup", async () => {
                  await jobApi.createFollowUp({
                    application_id: Number(followUpForm.applicationId),
                    follow_up_at: toIsoString(followUpForm.followUpAt) ?? "",
                    status: followUpForm.status,
                  });
                  setFollowUpForm({ applicationId: "", followUpAt: "", status: "pending" });
                });
              })()
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Application">
                <Select value={followUpForm.applicationId} onChange={(e) => setFollowUpForm({ ...followUpForm, applicationId: e.target.value })} required>
                  <option value="">Select</option>
                  {applications.map((a) => (
                    <option key={a.id} value={a.id}>
                      #{a.id} · {companyLookup.get(a.company_id)?.name ?? "Company"}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select value={followUpForm.status} onChange={(e) => setFollowUpForm({ ...followUpForm, status: e.target.value })}>
                  {["pending", "sent", "completed"].map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </Field>
              <Field label="Follow-up at">
                <Input type="datetime-local" value={followUpForm.followUpAt} onChange={(e) => setFollowUpForm({ ...followUpForm, followUpAt: e.target.value })} required />
              </Field>
            </div>
            <Button type="submit" disabled={submitting === "followup"}>
              {submitting === "followup" ? "Saving…" : "Create Follow-Up"}
            </Button>
          </form>
        </FormCard>

        {/* All applications table */}
        {applications.length > 0 && (
          <Table<JobApplication>
            data={applications}
            rowKey={(a) => a.id}
            columns={[
              {
                header: "Application",
                render: (a) => (
                  <div className="space-y-1">
                    <p className="font-medium text-white">
                      {companyLookup.get(a.company_id)?.name ?? "Unknown Company"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {postingLookup.get(a.job_posting_id)?.title ?? "—"}
                    </p>
                  </div>
                ),
              },
              {
                header: "Stage",
                render: (a) => (
                  <div className="flex flex-wrap gap-1.5">
                    <Badge>{a.stage}</Badge>
                    <Badge tone={toneFromStatus(a.status)}>{a.status}</Badge>
                  </div>
                ),
              },
            ]}
          />
        )}
      </AdvancedSection>
    </div>
  );
}
