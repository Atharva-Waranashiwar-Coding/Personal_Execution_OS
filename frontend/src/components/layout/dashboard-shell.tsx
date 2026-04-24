"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { clearStoredToken, getSessionEmail } from "@/lib/auth";
import { cn } from "@/lib/format";
import { getPageMeta, navigationSections, type NavigationItem } from "@/lib/navigation";
import { Badge, Button, Modal } from "@/components/ui";

function NavLink({
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
        "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition duration-150",
        isActive
          ? "border-cyan-300/30 bg-cyan-300/10 text-white"
          : "border-transparent text-slate-400 hover:border-white/8 hover:bg-white/5 hover:text-slate-200",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[10px] font-semibold tracking-[0.15em]",
          isActive
            ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-200"
            : "border-white/8 bg-white/5 text-slate-500",
        )}
      >
        {item.shortLabel}
      </span>
      {item.label}
    </Link>
  );
}

function SmallNavLink({ item, pathname }: { item: NavigationItem; pathname: string }) {
  const isActive =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition duration-150",
        isActive
          ? "bg-white/8 text-white"
          : "text-slate-500 hover:bg-white/5 hover:text-slate-300",
      )}
    >
      <span className="w-6 shrink-0 text-center text-[10px] font-semibold tracking-widest text-slate-600">
        {item.shortLabel}
      </span>
      {item.label}
    </Link>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const pageMeta = getPageMeta(pathname);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    clearStoredToken();
    router.replace("/login");
  };

  const primarySections = navigationSections.filter(
    (s) => s.title === "Command" || s.title === "Agents",
  );
  const systemSection = navigationSections.find((s) => s.title === "System");

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.15),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(45,212,191,0.08),_transparent_24%)]" />
      <div className="relative flex min-h-screen">

        {/* ── Sidebar ── */}
        <aside className="hidden w-[220px] shrink-0 flex-col border-r border-white/8 bg-slate-950/85 px-4 py-6 backdrop-blur-2xl lg:flex">
          <div className="mb-6 px-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
              Personal
            </p>
            <h1 className="mt-1 text-base font-semibold tracking-[-0.04em] text-white">
              Execution OS
            </h1>
          </div>

          <nav className="flex-1 space-y-5 overflow-y-auto">
            {/* Command + Agents — full NavLink */}
            {primarySections.map((section) => (
              <div key={section.title}>
                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-600">
                  {section.title}
                </p>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <NavLink key={item.href} item={item} pathname={pathname} />
                  ))}
                </div>
              </div>
            ))}

            {/* System — compact secondary links */}
            {systemSection ? (
              <div>
                <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-600">
                  {systemSection.title}
                </p>
                <div className="space-y-0.5">
                  {systemSection.items.map((item) => (
                    <SmallNavLink key={item.href} item={item} pathname={pathname} />
                  ))}
                </div>
              </div>
            ) : null}
          </nav>

          {/* Session footer — suppressHydrationWarning because getSessionEmail()
              reads document.cookie which is unavailable during SSR */}
          <div className="mt-4 border-t border-white/8 pt-4">
            <p
              className="truncate text-xs text-slate-500"
              suppressHydrationWarning
            >
              {getSessionEmail() ?? "Authenticated"}
            </p>
            <Button
              className="mt-3 w-full"
              size="sm"
              variant="secondary"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </aside>

        {/* ── Main area ── */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/8 bg-slate-950/75 px-4 py-3.5 backdrop-blur-2xl sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button
                  className="lg:hidden"
                  size="sm"
                  variant="secondary"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  Menu
                </Button>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-200/60">
                    {pageMeta.description}
                  </p>
                  <h2 className="text-xl font-semibold tracking-[-0.04em] text-white">
                    {pageMeta.label}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className="hidden rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-400 sm:inline"
                  suppressHydrationWarning
                >
                  {new Intl.DateTimeFormat("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  }).format(new Date())}
                </span>
                <Badge tone="success">Live</Badge>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      <Modal
        open={mobileMenuOpen}
        title="Navigation"
        description="Switch between execution domains."
        onClose={() => setMobileMenuOpen(false)}
      >
        <div className="space-y-5">
          {navigationSections.map((section) => (
            <div key={section.title}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
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
