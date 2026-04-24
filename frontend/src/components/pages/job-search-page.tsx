"use client";

import { useState } from "react";

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

export function JobSearchPage() {
  const { data, error, loading, reload } = useApiQuery(loadJobData);
  const [companyForm, setCompanyForm] = useState({
    name: "",
    industry: "",
    website: "",
  });
  const [postingForm, setPostingForm] = useState({
    companyId: "",
    title: "",
    description: "",
    location: "",
    jobType: "",
    postedAt: "",
    deadlineAt: "",
  });
  const [resumeForm, setResumeForm] = useState({
    name: "",
    focusArea: "",
    version: "v1",
  });
  const [applicationForm, setApplicationForm] = useState({
    companyId: "",
    postingId: "",
    resumeId: "",
    stage: "applied",
    status: "active",
    notes: "",
  });
  const [interviewForm, setInterviewForm] = useState({
    applicationId: "",
    interviewType: "phone",
    scheduledAt: "",
    status: "scheduled",
    preparationStatus: "pending",
  });
  const [followUpForm, setFollowUpForm] = useState({
    applicationId: "",
    followUpAt: "",
    status: "pending",
  });
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [lastWorkflowMessage, setLastWorkflowMessage] = useState<string | null>(null);

  const companies = data?.companies ?? [];
  const postings = data?.postings ?? [];
  const resumes = data?.resumes ?? [];
  const applications = data?.applications ?? [];
  const interviews = data?.interviews ?? [];
  const followUps = data?.followUps ?? [];

  const companyLookup = new Map(companies.map((company) => [company.id, company]));
  const postingLookup = new Map(postings.map((posting) => [posting.id, posting]));
  const resumeLookup = new Map(resumes.map((resume) => [resume.id, resume]));

  if (loading && !data) {
    return (
      <LoadingState
        title="Loading job search"
        description="Collecting companies, postings, applications, interviews, and follow-ups."
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

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Job Agent"
        title="Job Search"
        description="Manage the end-to-end job search pipeline: companies, postings, resumes, applications, interviews, follow-ups, and generated prep."
        actions={
          <>
            <Button variant="secondary" onClick={() => void reload()}>
              Refresh
            </Button>
            <Button
              onClick={() =>
                void runAction("generate-followups", async () => {
                  const response = await jobApi.generateFollowUps();
                  setLastWorkflowMessage(`Generated ${response.created_count} follow-up items.`);
                })
              }
              disabled={submitting === "generate-followups"}
            >
              {submitting === "generate-followups" ? "Generating..." : "Generate Follow-Ups"}
            </Button>
          </>
        }
      />

      {error ? <ErrorState description={error} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Applications"
          value={formatNumber(data?.insights?.active_applications)}
          hint="Currently active pipeline items"
          tone="success"
        />
        <StatCard
          label="Stale Applications"
          value={formatNumber(data?.insights?.stale_applications)}
          hint="Need follow-up or disposition"
          tone="warning"
        />
        <StatCard
          label="Upcoming Interviews"
          value={formatNumber(data?.insights?.upcoming_interviews)}
          hint="Scheduled interview count"
        />
        <StatCard
          label="Pipeline Health"
          value={data?.insights ? data.insights.pipeline_health_score.toFixed(1) : "0.0"}
          hint={`${formatNumber(data?.insights?.weekly_application_count)} applications this week`}
          tone="success"
        />
      </div>

      {lastWorkflowMessage ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {lastWorkflowMessage}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <FormCard
          badge="Companies"
          title="Add company"
          description="Create a company once, then attach multiple postings and applications."
        >
          <form
            className="space-y-4"
            onSubmit={(event) =>
              void (async () => {
                event.preventDefault();
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
              <Input
                value={companyForm.name}
                onChange={(event) =>
                  setCompanyForm({ ...companyForm, name: event.target.value })
                }
                required
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Industry">
                <Input
                  value={companyForm.industry}
                  onChange={(event) =>
                    setCompanyForm({ ...companyForm, industry: event.target.value })
                  }
                />
              </Field>
              <Field label="Website">
                <Input
                  value={companyForm.website}
                  onChange={(event) =>
                    setCompanyForm({ ...companyForm, website: event.target.value })
                  }
                />
              </Field>
            </div>
            <Button type="submit" disabled={submitting === "company"}>
              {submitting === "company" ? "Saving..." : "Create Company"}
            </Button>
          </form>
        </FormCard>

        <FormCard
          badge="Postings"
          title="Add posting"
          description="Persist job posting metadata and deadlines from a selected company."
        >
          <form
            className="space-y-4"
            onSubmit={(event) =>
              void (async () => {
                event.preventDefault();
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
                  setPostingForm({
                    companyId: "",
                    title: "",
                    description: "",
                    location: "",
                    jobType: "",
                    postedAt: "",
                    deadlineAt: "",
                  });
                });
              })()
            }
          >
            <Field label="Company">
              <Select
                value={postingForm.companyId}
                onChange={(event) =>
                  setPostingForm({ ...postingForm, companyId: event.target.value })
                }
                required
              >
                <option value="">Select company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Job title">
              <Input
                value={postingForm.title}
                onChange={(event) =>
                  setPostingForm({ ...postingForm, title: event.target.value })
                }
                required
              />
            </Field>
            <Field label="Description">
              <Textarea
                value={postingForm.description}
                onChange={(event) =>
                  setPostingForm({ ...postingForm, description: event.target.value })
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Location">
                <Input
                  value={postingForm.location}
                  onChange={(event) =>
                    setPostingForm({ ...postingForm, location: event.target.value })
                  }
                />
              </Field>
              <Field label="Job type">
                <Input
                  value={postingForm.jobType}
                  onChange={(event) =>
                    setPostingForm({ ...postingForm, jobType: event.target.value })
                  }
                />
              </Field>
              <Field label="Posted at">
                <Input
                  type="datetime-local"
                  value={postingForm.postedAt}
                  onChange={(event) =>
                    setPostingForm({ ...postingForm, postedAt: event.target.value })
                  }
                />
              </Field>
              <Field label="Deadline">
                <Input
                  type="datetime-local"
                  value={postingForm.deadlineAt}
                  onChange={(event) =>
                    setPostingForm({ ...postingForm, deadlineAt: event.target.value })
                  }
                />
              </Field>
            </div>
            <Button type="submit" disabled={submitting === "posting"}>
              {submitting === "posting" ? "Saving..." : "Create Posting"}
            </Button>
          </form>
        </FormCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <FormCard
          badge="Resumes"
          title="Add resume variant"
          description="Track resume versions targeted to specific focus areas."
        >
          <form
            className="space-y-4"
            onSubmit={(event) =>
              void (async () => {
                event.preventDefault();
                await runAction("resume", async () => {
                  await jobApi.createResume({
                    name: resumeForm.name,
                    focus_area: resumeForm.focusArea,
                    version: resumeForm.version,
                  });
                  setResumeForm({ name: "", focusArea: "", version: "v1" });
                });
              })()
            }
          >
            <Field label="Variant name">
              <Input
                value={resumeForm.name}
                onChange={(event) =>
                  setResumeForm({ ...resumeForm, name: event.target.value })
                }
                required
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Focus area">
                <Input
                  value={resumeForm.focusArea}
                  onChange={(event) =>
                    setResumeForm({ ...resumeForm, focusArea: event.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Version">
                <Input
                  value={resumeForm.version}
                  onChange={(event) =>
                    setResumeForm({ ...resumeForm, version: event.target.value })
                  }
                />
              </Field>
            </div>
            <Button type="submit" disabled={submitting === "resume"}>
              {submitting === "resume" ? "Saving..." : "Create Resume Variant"}
            </Button>
          </form>
        </FormCard>

        <FormCard
          badge="Applications"
          title="Add application"
          description="Create an application tied to a company, posting, and resume variant."
        >
          <form
            className="space-y-4"
            onSubmit={(event) =>
              void (async () => {
                event.preventDefault();
                await runAction("application", async () => {
                  await jobApi.createApplication({
                    company_id: Number(applicationForm.companyId),
                    job_posting_id: Number(applicationForm.postingId),
                    resume_variant_id: Number(applicationForm.resumeId),
                    stage: applicationForm.stage,
                    status: applicationForm.status,
                    notes: applicationForm.notes || undefined,
                  });
                  setApplicationForm({
                    companyId: "",
                    postingId: "",
                    resumeId: "",
                    stage: "applied",
                    status: "active",
                    notes: "",
                  });
                });
              })()
            }
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Company">
                <Select
                  value={applicationForm.companyId}
                  onChange={(event) =>
                    setApplicationForm({ ...applicationForm, companyId: event.target.value })
                  }
                  required
                >
                  <option value="">Select</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Posting">
                <Select
                  value={applicationForm.postingId}
                  onChange={(event) =>
                    setApplicationForm({ ...applicationForm, postingId: event.target.value })
                  }
                  required
                >
                  <option value="">Select</option>
                  {postings.map((posting) => (
                    <option key={posting.id} value={posting.id}>
                      {posting.title}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Resume">
                <Select
                  value={applicationForm.resumeId}
                  onChange={(event) =>
                    setApplicationForm({ ...applicationForm, resumeId: event.target.value })
                  }
                  required
                >
                  <option value="">Select</option>
                  {resumes.map((resume) => (
                    <option key={resume.id} value={resume.id}>
                      {resume.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Stage">
                <Select
                  value={applicationForm.stage}
                  onChange={(event) =>
                    setApplicationForm({ ...applicationForm, stage: event.target.value })
                  }
                >
                  {["applied", "screen", "interview", "offer", "rejected"].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  value={applicationForm.status}
                  onChange={(event) =>
                    setApplicationForm({ ...applicationForm, status: event.target.value })
                  }
                >
                  {["active", "paused", "closed"].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Notes">
              <Textarea
                value={applicationForm.notes}
                onChange={(event) =>
                  setApplicationForm({ ...applicationForm, notes: event.target.value })
                }
              />
            </Field>
            <Button type="submit" disabled={submitting === "application"}>
              {submitting === "application" ? "Saving..." : "Create Application"}
            </Button>
          </form>
        </FormCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <FormCard
          badge="Interviews"
          title="Add interview"
          description="Capture interview schedule and prep status tied to an application."
        >
          <form
            className="space-y-4"
            onSubmit={(event) =>
              void (async () => {
                event.preventDefault();
                await runAction("interview", async () => {
                  await jobApi.createInterview({
                    application_id: Number(interviewForm.applicationId),
                    interview_type: interviewForm.interviewType,
                    scheduled_at: toIsoString(interviewForm.scheduledAt) ?? "",
                    status: interviewForm.status,
                    preparation_status: interviewForm.preparationStatus,
                  });
                  setInterviewForm({
                    applicationId: "",
                    interviewType: "phone",
                    scheduledAt: "",
                    status: "scheduled",
                    preparationStatus: "pending",
                  });
                });
              })()
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Application">
                <Select
                  value={interviewForm.applicationId}
                  onChange={(event) =>
                    setInterviewForm({ ...interviewForm, applicationId: event.target.value })
                  }
                  required
                >
                  <option value="">Select</option>
                  {applications.map((application) => (
                    <option key={application.id} value={application.id}>
                      #{application.id} · {companyLookup.get(application.company_id)?.name ?? "Company"}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Interview type">
                <Input
                  value={interviewForm.interviewType}
                  onChange={(event) =>
                    setInterviewForm({ ...interviewForm, interviewType: event.target.value })
                  }
                />
              </Field>
              <Field label="Scheduled at">
                <Input
                  type="datetime-local"
                  value={interviewForm.scheduledAt}
                  onChange={(event) =>
                    setInterviewForm({ ...interviewForm, scheduledAt: event.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Status">
                <Select
                  value={interviewForm.status}
                  onChange={(event) =>
                    setInterviewForm({ ...interviewForm, status: event.target.value })
                  }
                >
                  {["scheduled", "completed", "cancelled"].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Preparation status">
                <Select
                  value={interviewForm.preparationStatus}
                  onChange={(event) =>
                    setInterviewForm({
                      ...interviewForm,
                      preparationStatus: event.target.value,
                    })
                  }
                >
                  {["pending", "in_progress", "completed"].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button type="submit" disabled={submitting === "interview"}>
              {submitting === "interview" ? "Saving..." : "Create Interview"}
            </Button>
          </form>
        </FormCard>

        <FormCard
          badge="Follow-ups"
          title="Add follow-up"
          description="Track outreach timing and completion status per application."
        >
          <form
            className="space-y-4"
            onSubmit={(event) =>
              void (async () => {
                event.preventDefault();
                await runAction("followup", async () => {
                  await jobApi.createFollowUp({
                    application_id: Number(followUpForm.applicationId),
                    follow_up_at: toIsoString(followUpForm.followUpAt) ?? "",
                    status: followUpForm.status,
                  });
                  setFollowUpForm({
                    applicationId: "",
                    followUpAt: "",
                    status: "pending",
                  });
                });
              })()
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Application">
                <Select
                  value={followUpForm.applicationId}
                  onChange={(event) =>
                    setFollowUpForm({ ...followUpForm, applicationId: event.target.value })
                  }
                  required
                >
                  <option value="">Select</option>
                  {applications.map((application) => (
                    <option key={application.id} value={application.id}>
                      #{application.id} · {companyLookup.get(application.company_id)?.name ?? "Company"}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  value={followUpForm.status}
                  onChange={(event) =>
                    setFollowUpForm({ ...followUpForm, status: event.target.value })
                  }
                >
                  {["pending", "sent", "completed"].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Follow-up at">
                <Input
                  type="datetime-local"
                  value={followUpForm.followUpAt}
                  onChange={(event) =>
                    setFollowUpForm({ ...followUpForm, followUpAt: event.target.value })
                  }
                  required
                />
              </Field>
            </div>
            <Button type="submit" disabled={submitting === "followup"}>
              {submitting === "followup" ? "Saving..." : "Create Follow-Up"}
            </Button>
          </form>
        </FormCard>
      </div>

      <Card className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-white">Pipeline Health Cards</h3>
          <p className="text-sm text-slate-400">
            Agent-level summary metrics returned by the job insights endpoint.
          </p>
        </div>
        <KeyValueList
          items={[
            { label: "Pending follow-ups", value: formatNumber(data?.insights?.pending_followups) },
            { label: "Upcoming deadlines", value: formatNumber(data?.insights?.upcoming_deadlines) },
            { label: "Weekly applications", value: formatNumber(data?.insights?.weekly_application_count) },
            { label: "Weekly target", value: formatNumber(data?.insights?.weekly_target_count) },
          ]}
        />
      </Card>

      <Table<JobApplication>
        data={applications}
        rowKey={(application) => application.id}
        columns={[
          {
            header: "Application",
            render: (application) => (
              <div className="space-y-2">
                <p className="font-medium text-white">
                  {companyLookup.get(application.company_id)?.name ?? `Company #${application.company_id}`}
                </p>
                <p className="text-sm text-slate-400">
                  {postingLookup.get(application.job_posting_id)?.title ?? `Posting #${application.job_posting_id}`}
                </p>
                <p className="text-xs text-slate-500">
                  Resume {resumeLookup.get(application.resume_variant_id)?.name ?? application.resume_variant_id}
                </p>
              </div>
            ),
          },
          {
            header: "Meta",
            render: (application) => (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge tone={toneFromStatus(application.status)}>{application.status}</Badge>
                  <Badge>{application.stage}</Badge>
                </div>
                <p className="text-xs text-slate-500">
                  Fit score {application.fit_score.toFixed(1)}
                </p>
              </div>
            ),
          },
          {
            header: "Timeline",
            render: (application) => (
              <div className="space-y-1 text-sm text-slate-300">
                <p>Applied {formatDateTime(application.applied_at)}</p>
                <p className="text-xs text-slate-500">
                  Updated {formatDateTime(application.last_update_at)}
                </p>
              </div>
            ),
          },
        ]}
      />

      <Table<Interview>
        data={interviews}
        rowKey={(interview) => interview.id}
        columns={[
          {
            header: "Interview",
            render: (interview) => (
              <div className="space-y-2">
                <p className="font-medium text-white">{interview.interview_type}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={toneFromStatus(interview.status)}>{interview.status}</Badge>
                  <Badge>{interview.preparation_status}</Badge>
                </div>
              </div>
            ),
          },
          {
            header: "Schedule",
            render: (interview) => (
              <p className="text-sm text-slate-300">{formatDateTime(interview.scheduled_at)}</p>
            ),
          },
          {
            header: "Actions",
            render: (interview) => (
              <Button
                size="sm"
                variant="secondary"
                disabled={submitting === `prep-${interview.id}`}
                onClick={() =>
                  void runAction(`prep-${interview.id}`, async () => {
                    const response = await jobApi.generateInterviewPrep(interview.id);
                    setLastWorkflowMessage(
                      `Generated ${response.created_count} prep tasks for interview #${interview.id}.`,
                    );
                  })
                }
              >
                {submitting === `prep-${interview.id}` ? "Generating..." : "Generate Prep Tasks"}
              </Button>
            ),
          },
        ]}
      />

      <Table<FollowUp>
        data={followUps}
        rowKey={(followUp) => followUp.id}
        columns={[
          {
            header: "Follow-up",
            render: (followUp) => (
              <div className="space-y-2">
                <p className="font-medium text-white">Application #{followUp.application_id}</p>
                <Badge tone={toneFromStatus(followUp.status)}>{followUp.status}</Badge>
              </div>
            ),
          },
          {
            header: "When",
            render: (followUp) => (
              <p className="text-sm text-slate-300">{formatDateTime(followUp.follow_up_at)}</p>
            ),
          },
        ]}
      />
    </div>
  );
}
