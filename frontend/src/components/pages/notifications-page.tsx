"use client";

import { notificationsApi } from "@/lib/api";
import { formatDateTime, formatNumber, toneFromStatus } from "@/lib/format";
import type { NotificationHistory } from "@/lib/types";
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

export function NotificationsPage() {
  const { data, error, loading, reload } = useApiQuery(notificationsApi.listHistory);

  if (loading && !data) {
    return (
      <LoadingState
        title="Loading notifications"
        description="Pulling notification delivery history."
      />
    );
  }

  const notifications = data ?? [];

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Delivery History"
        title="Notifications"
        description="Inspect notification history across channels and notification types."
        actions={
          <Button variant="secondary" onClick={() => void reload()}>
            Refresh
          </Button>
        }
      />

      {error ? <ErrorState description={error} /> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total Notifications"
          value={formatNumber(notifications.length)}
          hint="All logged deliveries"
        />
        <StatCard
          label="Delivered"
          value={formatNumber(
            notifications.filter((item) => item.status === "sent").length,
          )}
          hint="Notifications marked sent"
          tone="success"
        />
        <StatCard
          label="Unique Channels"
          value={formatNumber(new Set(notifications.map((item) => item.channel)).size)}
          hint="Distinct delivery channels"
        />
      </div>

      <Table<NotificationHistory>
        data={notifications}
        rowKey={(notification) => notification.id}
        columns={[
          {
            header: "Notification",
            render: (notification) => (
              <div className="space-y-2">
                <p className="font-medium text-white">{notification.title}</p>
                {notification.body ? (
                  <p className="text-sm leading-6 text-slate-400">{notification.body}</p>
                ) : null}
              </div>
            ),
          },
          {
            header: "Meta",
            render: (notification) => (
              <div className="flex flex-wrap gap-2">
                <Badge>{notification.channel}</Badge>
                <Badge>{notification.notification_type}</Badge>
                <Badge tone={toneFromStatus(notification.status)}>{notification.status}</Badge>
              </div>
            ),
          },
          {
            header: "Sent",
            render: (notification) => (
              <p className="text-sm text-slate-300">{formatDateTime(notification.sent_at)}</p>
            ),
          },
        ]}
      />
    </div>
  );
}
