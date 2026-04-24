export interface NavigationItem {
  href: string;
  label: string;
  description: string;
  shortLabel: string;
}

export interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

export const navigationSections: NavigationSection[] = [
  {
    title: "Execution",
    items: [
      {
        href: "/dashboard",
        label: "Overview",
        description: "Cross-domain command center and execution signal.",
        shortLabel: "OV",
      },
      {
        href: "/today",
        label: "Today View",
        description: "Tasks and plans that matter right now.",
        shortLabel: "TD",
      },
      {
        href: "/weekly",
        label: "Weekly View",
        description: "Seven-day workload and planning horizon.",
        shortLabel: "WK",
      },
      {
        href: "/goals",
        label: "Goals",
        description: "Longer-running outcomes and milestones.",
        shortLabel: "GL",
      },
      {
        href: "/tasks",
        label: "Tasks",
        description: "Execution queue with due dates and reminders.",
        shortLabel: "TS",
      },
      {
        href: "/plans",
        label: "Plans",
        description: "Structured daily and weekly plans.",
        shortLabel: "PL",
      },
      {
        href: "/orchestrator",
        label: "Orchestrator",
        description: "Agent-ranked briefs and execution feedback.",
        shortLabel: "OR",
      },
    ],
  },
  {
    title: "Agents",
    items: [
      {
        href: "/study-focus",
        label: "Study Focus",
        description: "Tracks, topics, subtopics, sessions, and recovery.",
        shortLabel: "SF",
      },
      {
        href: "/life-admin",
        label: "Life Admin",
        description: "Bills, chores, reminders, and escalation.",
        shortLabel: "LA",
      },
      {
        href: "/job-search",
        label: "Job Search",
        description: "Pipeline, interviews, follow-ups, and prep.",
        shortLabel: "JS",
      },
      {
        href: "/health-routine",
        label: "Health Routine",
        description: "Profile, recovery, workouts, and recommendations.",
        shortLabel: "HR",
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        href: "/approvals",
        label: "Approvals",
        description: "Pending decisions and resolved actions.",
        shortLabel: "AP",
      },
      {
        href: "/notifications",
        label: "Notifications",
        description: "Delivery history across channels.",
        shortLabel: "NT",
      },
      {
        href: "/integrations",
        label: "Integrations",
        description: "Google Calendar, Gmail, sync logs, and prompts.",
        shortLabel: "IN",
      },
      {
        href: "/analytics",
        label: "Analytics",
        description: "Operational metrics and final analytics summary.",
        shortLabel: "AN",
      },
      {
        href: "/demo-mode",
        label: "Demo Mode",
        description: "Seed and inspect sample execution data.",
        shortLabel: "DM",
      },
    ],
  },
];

const navigationItems = navigationSections.flatMap((section) => section.items);

export function getPageMeta(pathname: string) {
  const exact = navigationItems.find((item) => item.href === pathname);

  if (exact) {
    return exact;
  }

  const partial = navigationItems.find(
    (item) => pathname.startsWith(item.href) && item.href !== "/dashboard",
  );

  return (
    partial ?? {
      href: pathname,
      label: "Workspace",
      description: "Execution workspace.",
      shortLabel: "WS",
    }
  );
}
