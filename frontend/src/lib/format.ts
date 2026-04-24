import { ApiError } from "@/lib/api";

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function toDateTimeLocalValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function toIsoString(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function formatDateTime(
  value?: string | null,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  },
) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", options).format(date);
}

export function formatDate(value?: string | null) {
  return formatDateTime(value, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatPercent(value?: number | null, fractionDigits = 0) {
  if (value === null || value === undefined) {
    return "0%";
  }

  return `${value.toFixed(fractionDigits)}%`;
}

export function formatNumber(value?: number | null, maximumFractionDigits = 0) {
  if (value === null || value === undefined) {
    return "0";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);
}

export function formatCurrency(value?: number | null) {
  if (value === null || value === undefined) {
    return "$0.00";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  }).format(value);
}

export function titleCase(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

export function safeJsonParse(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

export function compactObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry === undefined) {
        return false;
      }

      if (typeof entry === "string") {
        return entry.trim().length > 0;
      }

      return true;
    }),
  ) as Partial<T>;
}

export function toOptionalNumber(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function toneFromStatus(value?: string | null) {
  const normalized = value?.toLowerCase() ?? "";

  if (
    normalized.includes("complete") ||
    normalized.includes("approved") ||
    normalized.includes("active") ||
    normalized.includes("useful")
  ) {
    return "success" as const;
  }

  if (
    normalized.includes("draft") ||
    normalized.includes("pending") ||
    normalized.includes("scheduled") ||
    normalized.includes("planned")
  ) {
    return "warning" as const;
  }

  if (
    normalized.includes("reject") ||
    normalized.includes("overdue") ||
    normalized.includes("missed") ||
    normalized.includes("unrealistic")
  ) {
    return "danger" as const;
  }

  return "neutral" as const;
}

export function toneFromPriority(value?: string | null) {
  const normalized = value?.toLowerCase() ?? "";

  if (normalized === "high" || normalized === "critical") {
    return "danger" as const;
  }

  if (normalized === "medium") {
    return "warning" as const;
  }

  if (normalized === "low") {
    return "success" as const;
  }

  return "neutral" as const;
}
