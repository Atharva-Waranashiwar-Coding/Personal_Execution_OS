"use client";

import type { ReactNode } from "react";

import { Card, Badge } from "@/components/ui";

export function FormCard({
  title,
  description,
  badge,
  children,
}: {
  title: string;
  description?: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <Card className="space-y-4">
      <div className="space-y-2">
        {badge ? <Badge>{badge}</Badge> : null}
        <div className="space-y-1">
          <h3 className="text-lg font-medium text-white">{title}</h3>
          {description ? <p className="text-sm leading-6 text-slate-400">{description}</p> : null}
        </div>
      </div>
      {children}
    </Card>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-slate-300">{label}</span>
        {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

export function KeyValueList({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-3xl border border-white/8 bg-white/5 px-4 py-4"
        >
          <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {item.label}
          </dt>
          <dd className="mt-2 text-sm text-slate-200">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
