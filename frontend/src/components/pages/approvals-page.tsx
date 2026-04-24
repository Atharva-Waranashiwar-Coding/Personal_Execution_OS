"use client";

import { useState } from "react";

import { approvalsApi } from "@/lib/api";
import { formatDateTime, formatNumber, toneFromStatus } from "@/lib/format";
import type { Approval } from "@/lib/types";
import { useApiQuery } from "@/hooks/use-api-query";
import {
  Badge,
  Button,
  ErrorState,
  LoadingState,
  SectionHeader,
  StatCard,
  Table,
} from "@/components/ui";

export function ApprovalsPage() {
  const { data, error, loading, reload } = useApiQuery(approvalsApi.list);
  const [resolvingId, setResolvingId] = useState<number | null>(null);

  if (loading && !data) {
    return (
      <LoadingState
        title="Loading approvals"
        description="Reading approval queues and resolution history."
      />
    );
  }

  const approvals = data ?? [];
  const pending = approvals.filter((approval) => approval.status === "pending");
  const resolved = approvals.filter((approval) => approval.status !== "pending");

  const resolveApproval = async (approvalId: number, status: "approved" | "rejected") => {
    setResolvingId(approvalId);

    try {
      await approvalsApi.resolve(approvalId, { status });
      await reload();
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Human Approval Loop"
        title="Approvals"
        description="Review pending approvals, resolve them, and inspect historical outcomes."
        actions={
          <Button variant="secondary" onClick={() => void reload()}>
            Refresh
          </Button>
        }
      />

      {error ? <ErrorState description={error} /> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Pending"
          value={formatNumber(pending.length)}
          hint="Waiting on user action"
          tone="warning"
        />
        <StatCard
          label="Approved"
          value={formatNumber(
            resolved.filter((approval) => approval.status === "approved").length,
          )}
          hint="Resolved positively"
          tone="success"
        />
        <StatCard
          label="Rejected"
          value={formatNumber(
            resolved.filter((approval) => approval.status === "rejected").length,
          )}
          hint="Resolved negatively"
          tone="danger"
        />
      </div>

      <Table<Approval>
        data={pending}
        rowKey={(approval) => approval.id}
        columns={[
          {
            header: "Approval",
            render: (approval) => (
              <div className="space-y-2">
                <p className="font-medium text-white">{approval.title}</p>
                <p className="text-sm text-slate-400">
                  {approval.description ?? "No description"}
                </p>
                <Badge>{approval.action_type}</Badge>
              </div>
            ),
          },
          {
            header: "Created",
            render: (approval) => (
              <p className="text-sm text-slate-300">{formatDateTime(approval.created_at)}</p>
            ),
          },
          {
            header: "Actions",
            render: (approval) => (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={resolvingId === approval.id}
                  onClick={() => void resolveApproval(approval.id, "approved")}
                >
                  {resolvingId === approval.id ? "Saving..." : "Approve"}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={resolvingId === approval.id}
                  onClick={() => void resolveApproval(approval.id, "rejected")}
                >
                  Reject
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Table<Approval>
        data={resolved}
        rowKey={(approval) => approval.id}
        columns={[
          {
            header: "Resolved Approval",
            render: (approval) => (
              <div className="space-y-2">
                <p className="font-medium text-white">{approval.title}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge>{approval.action_type}</Badge>
                  <Badge tone={toneFromStatus(approval.status)}>{approval.status}</Badge>
                </div>
              </div>
            ),
          },
          {
            header: "Resolved At",
            render: (approval) => (
              <p className="text-sm text-slate-300">{formatDateTime(approval.resolved_at)}</p>
            ),
          },
        ]}
      />
    </div>
  );
}
