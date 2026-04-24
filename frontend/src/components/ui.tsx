"use client";

import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
} from "react";

import { cn, formatNumber } from "@/lib/format";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";
type BadgeTone = "neutral" | "success" | "warning" | "danger";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/10 bg-slate-950/70 p-5 shadow-[0_24px_80px_rgba(3,8,20,0.36)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const variantClassNames: Record<ButtonVariant, string> = {
    primary:
      "bg-linear-to-r from-cyan-300 via-sky-400 to-teal-300 text-slate-950 shadow-[0_16px_40px_rgba(36,211,255,0.24)] hover:brightness-105",
    secondary:
      "border border-white/12 bg-white/6 text-slate-50 hover:bg-white/10",
    ghost: "text-slate-300 hover:bg-white/6 hover:text-white",
    danger:
      "border border-rose-400/30 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25",
  };

  const sizeClassNames: Record<ButtonSize, string> = {
    sm: "h-9 rounded-2xl px-3 text-sm",
    md: "h-11 rounded-2xl px-4 text-sm",
    lg: "h-12 rounded-2xl px-5 text-sm font-medium",
  };

  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        variantClassNames[variant],
        sizeClassNames[size],
        className,
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-300/50",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-cyan-300/50",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-slate-50 outline-none focus:border-cyan-300/50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  const toneClassNames: Record<BadgeTone, string> = {
    neutral: "border-white/10 bg-white/6 text-slate-200",
    success: "border-emerald-400/25 bg-emerald-500/15 text-emerald-200",
    warning: "border-amber-300/25 bg-amber-400/15 text-amber-100",
    danger: "border-rose-400/25 bg-rose-500/15 text-rose-100",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] uppercase",
        toneClassNames[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200/70">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-3xl text-sm leading-6 text-slate-400">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="border-dashed border-white/12 bg-slate-950/45 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-6">
        <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/80">
          Empty
        </div>
        <h3 className="text-lg font-medium text-white">{title}</h3>
        <p className="text-sm leading-6 text-slate-400">{description}</p>
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </Card>
  );
}

export function LoadingState({
  title = "Loading workspace",
  description = "Pulling the latest data from the API.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Card>
      <div className="space-y-4">
        <div>
          <p className="text-lg font-medium text-white">{title}</p>
          <p className="text-sm text-slate-400">{description}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-3xl border border-white/8 bg-white/6"
            />
          ))}
        </div>
        <div className="h-56 animate-pulse rounded-3xl border border-white/8 bg-white/6" />
      </div>
    </Card>
  );
}

export function ErrorState({
  title = "Unable to load data",
  description,
  action,
}: {
  title?: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="border-rose-400/20 bg-rose-500/10">
      <div className="space-y-3">
        <Badge tone="danger">Error</Badge>
        <div className="space-y-1">
          <h3 className="text-lg font-medium text-white">{title}</h3>
          <p className="text-sm leading-6 text-rose-100/80">{description}</p>
        </div>
        {action ? <div className="pt-1">{action}</div> : null}
      </div>
    </Card>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: BadgeTone;
}) {
  const toneClassNames: Record<BadgeTone, string> = {
    neutral: "from-white/8 to-transparent",
    success: "from-emerald-400/18 to-transparent",
    warning: "from-amber-300/18 to-transparent",
    danger: "from-rose-400/18 to-transparent",
  };

  return (
    <Card className="overflow-hidden p-0">
      <div
        className={cn(
          "bg-linear-to-br px-5 py-5",
          toneClassNames[tone],
        )}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          {label}
        </p>
        <div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
          {value}
        </div>
        {hint ? <p className="mt-2 text-sm text-slate-400">{hint}</p> : null}
      </div>
    </Card>
  );
}

export interface TableColumn<T> {
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
}

export function Table<T>({
  data,
  columns,
  rowKey,
  emptyState,
}: {
  data: T[];
  columns: TableColumn<T>[];
  rowKey: (row: T) => string | number;
  emptyState?: ReactNode;
}) {
  if (!data.length) {
    return (
      emptyState ?? (
        <EmptyState
          title="No data yet"
          description="This section will populate as soon as records are created."
        />
      )
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/55">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10 text-left">
          <thead className="bg-white/5">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={cn(
                    "px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400",
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {data.map((row) => (
              <tr key={rowKey(row)} className="align-top">
                {columns.map((column, index) => (
                  <td
                    key={index}
                    className={cn("px-4 py-4 text-sm text-slate-200", column.className)}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function JsonPreview({
  title,
  value,
}: {
  title: string;
  value: unknown;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-white/10 px-5 py-4">
        <p className="text-sm font-medium text-white">{title}</p>
      </div>
      <pre className="overflow-x-auto px-5 py-4 text-xs leading-6 text-cyan-100/90">
        {JSON.stringify(value, null, 2)}
      </pre>
    </Card>
  );
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close modal"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[32px] border border-white/12 bg-slate-950/95 p-6 shadow-[0_32px_120px_rgba(0,0,0,0.55)]">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-2xl font-semibold tracking-[-0.04em] text-white">
              {title}
            </h3>
            {description ? (
              <p className="text-sm leading-6 text-slate-400">{description}</p>
            ) : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SimpleBarChart({
  title,
  description,
  data,
}: {
  title: string;
  description?: string;
  data: Array<{ label: string; value: number; suffix?: string }>;
}) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <Card>
      <div className="space-y-5">
        <div className="space-y-1">
          <h3 className="text-lg font-medium text-white">{title}</h3>
          {description ? <p className="text-sm text-slate-400">{description}</p> : null}
        </div>
        <div className="space-y-3">
          {data.map((item) => {
            const width = `${Math.max((item.value / maxValue) * 100, 8)}%`;

            return (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-300">{item.label}</span>
                  <span className="font-medium text-white">
                    {formatNumber(item.value, 2)}
                    {item.suffix ?? ""}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-white/6">
                  <div
                    className="h-3 rounded-full bg-linear-to-r from-cyan-300 via-sky-400 to-teal-300"
                    style={{ width }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
