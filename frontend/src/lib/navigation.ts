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

// Primary navigation — rendered in the sidebar
export const navigationSections: NavigationSection[] = [
  {
    title: "Command",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        description: "Daily brief, agent status, and top priorities.",
        shortLabel: "DB",
      },
      {
        href: "/orchestrator",
        label: "Orchestrator",
        description: "Full plan briefs, ranked items, and feedback.",
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
        description: "Topics, sessions, streaks, and progress.",
        shortLabel: "SF",
      },
      {
        href: "/job-search",
        label: "Job Search",
        description: "Pipeline, applications, interviews, and follow-ups.",
        shortLabel: "JS",
      },
      {
        href: "/health-routine",
        label: "Health Routine",
        description: "Recovery logs, workouts, and recommendations.",
        shortLabel: "HR",
      },
      {
        href: "/life-admin",
        label: "Life Admin",
        description: "Bills, chores, reminders, and captures.",
        shortLabel: "LA",
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        href: "/approvals",
        label: "Approvals",
        description: "Pending decisions and resolved actions.",
        shortLabel: "AP",
      },
      {
        href: "/integrations",
        label: "Integrations",
        description: "Google Calendar, Gmail, and sync logs.",
        shortLabel: "IN",
      },
      {
        href: "/analytics",
        label: "Analytics",
        description: "Operational metrics and final analytics.",
        shortLabel: "AN",
      },
    ],
  },
];

// Full page metadata — includes non-nav routes so the header always shows
// correct titles for pages like /tasks, /goals, /today, etc.
const ALL_PAGE_META: NavigationItem[] = [
  ...navigationSections.flatMap((s) => s.items),
  { href: "/today", label: "Today View", description: "Tasks and plans scheduled today.", shortLabel: "TD" },
  { href: "/weekly", label: "Weekly View", description: "Seven-day planning horizon.", shortLabel: "WK" },
  { href: "/goals", label: "Goals", description: "Longer-running outcomes and milestones.", shortLabel: "GL" },
  { href: "/tasks", label: "Tasks", description: "Execution queue with due dates.", shortLabel: "TS" },
  { href: "/plans", label: "Plans", description: "Structured daily and weekly plans.", shortLabel: "PL" },
  { href: "/notifications", label: "Notifications", description: "Delivery history across channels.", shortLabel: "NT" },
  { href: "/demo-mode", label: "Demo Mode", description: "Seed and inspect sample data.", shortLabel: "DM" },
];

export function getPageMeta(pathname: string): NavigationItem {
  const exact = ALL_PAGE_META.find((item) => item.href === pathname);
  if (exact) return exact;

  const partial = ALL_PAGE_META.find(
    (item) => item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`),
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
