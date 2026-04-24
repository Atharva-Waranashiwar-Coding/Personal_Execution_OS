"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { clearStoredToken, getSessionEmail } from "@/lib/auth";
import { cn } from "@/lib/format";
import { getPageMeta, navigationSections, type NavigationItem } from "@/lib/navigation";
import { Badge, Button, Modal } from "@/components/ui";

function NavigationLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavigationItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const isActive =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group flex items-start gap-3 rounded-3xl border px-4 py-3 transition duration-200",
        isActive
          ? "border-cyan-300/35 bg-cyan-300/10 text-white"
          : "border-transparent text-slate-400 hover:border-white/8 hover:bg-white/5 hover:text-white",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-xs font-semibold tracking-[0.2em]",
          isActive
            ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
            : "border-white/8 bg-white/5 text-slate-400",
        )}
      >
        {item.shortLabel}
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium">{item.label}</div>
        <div className="text-xs leading-5 text-slate-500 group-hover:text-slate-400">
          {item.description}
        </div>
      </div>
    </Link>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const pageMeta = getPageMeta(pathname);
  const sessionEmail = getSessionEmail();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    clearStoredToken();
    router.replace("/login");
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(45,212,191,0.12),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.08),_transparent_24%)]" />
      <div className="relative flex min-h-screen">
        <aside className="hidden w-[320px] shrink-0 border-r border-white/8 bg-slate-950/80 px-6 py-8 backdrop-blur-2xl lg:flex lg:flex-col">
          <div className="mb-8 space-y-3">
            <Badge tone="success">Deployment Ready</Badge>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-[-0.05em] text-white">
                Personal Execution OS
              </h1>
              <p className="text-sm leading-6 text-slate-400">
                Multi-agent operating system for execution, planning, and personal
                logistics.
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-7 overflow-y-auto pr-1">
            {navigationSections.map((section) => (
              <div key={section.title} className="space-y-3">
                <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  {section.title}
                </p>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <NavigationLink key={item.href} item={item} pathname={pathname} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Session
            </p>
            <p className="mt-3 break-all text-sm text-slate-200">
              {sessionEmail ?? "Authenticated user"}
            </p>
            <Button className="mt-4 w-full" variant="secondary" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/8 bg-slate-950/70 px-4 py-4 backdrop-blur-2xl sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <Button
                  className="lg:hidden"
                  size="sm"
                  variant="secondary"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  Menu
                </Button>
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200/70">
                    Operating View
                  </p>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-[-0.05em] text-white">
                      {pageMeta.label}
                    </h2>
                    <p className="text-sm text-slate-400">{pageMeta.description}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-sm text-slate-300">
                  {new Intl.DateTimeFormat("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  }).format(new Date())}
                </div>
                <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100/90">
                  {sessionEmail ?? "Authenticated"}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>

      <Modal
        open={mobileMenuOpen}
        title="Navigation"
        description="Switch between execution domains and agent workspaces."
        onClose={() => setMobileMenuOpen(false)}
      >
        <div className="space-y-6">
          {navigationSections.map((section) => (
            <div key={section.title} className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                {section.title}
              </p>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <NavigationLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    onNavigate={() => setMobileMenuOpen(false)}
                  />
                ))}
              </div>
            </div>
          ))}
          <Button className="w-full" variant="secondary" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </Modal>
    </div>
  );
}
