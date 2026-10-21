import { format, formatDistanceStrict, parseISO } from "date-fns";
import type { TimeRange } from "@/domain/models/common";

export function formatTimestamp(iso: string): string {
  try {
    return format(parseISO(iso), "yyyy-MM-dd HH:mm:ss");
  } catch {
    return iso;
  }
}

export function formatTime(iso: string): string {
  try {
    return format(parseISO(iso), "HH:mm:ss");
  } catch {
    return iso;
  }
}

export function formatDate(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}

export function formatShortDateTime(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d, HH:mm");
  } catch {
    return iso;
  }
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  try {
    return formatDistanceStrict(parseISO(iso), now, { addSuffix: true });
  } catch {
    return iso;
  }
}

export function formatDuration(ms: number): string {
  if (!isFinite(ms) || ms < 0) return "—";
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (hours < 24) return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  return remH > 0 ? `${days}d ${remH}h` : `${days}d`;
}

const PRESET_HOURS: Record<Exclude<TimeRange["preset"], "custom">, number> = {
  "1h": 1,
  "6h": 6,
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
};

export function presetRange(
  preset: Exclude<TimeRange["preset"], "custom">,
  now: Date = new Date()
): TimeRange {
  const hours = PRESET_HOURS[preset];
  return {
    from: new Date(now.getTime() - hours * 3600_000).toISOString(),
    to: now.toISOString(),
    preset,
  };
}

export function customRange(from: Date, to: Date): TimeRange {
  return { from: from.toISOString(), to: to.toISOString(), preset: "custom" };
}

export function isInRange(iso: string, range: TimeRange): boolean {
  const t = new Date(iso).getTime();
  return t >= new Date(range.from).getTime() && t <= new Date(range.to).getTime();
}

export function rangeLabel(range: TimeRange): string {
  if (range.preset !== "custom") {
    const labels: Record<string, string> = {
      "1h": "Last 1 hour",
      "6h": "Last 6 hours",
      "24h": "Last 24 hours",
      "7d": "Last 7 days",
      "30d": "Last 30 days",
    };
    return labels[range.preset] ?? range.preset;
  }
  return `${formatShortDateTime(range.from)} → ${formatShortDateTime(range.to)}`;
}

export function rangeHours(range: TimeRange): number {
  return (
    (new Date(range.to).getTime() - new Date(range.from).getTime()) / 3600_000
  );
}

/** Bucket size (in minutes) appropriate for a time range, for charts. */
export function bucketMinutesForRange(hours: number): number {
  if (hours <= 1) return 5;
  if (hours <= 6) return 30;
  if (hours <= 24) return 60;
  if (hours <= 24 * 7) return 360;
  return 1440;
}
