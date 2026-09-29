/** "no_show" reads as "No show". Used for statuses and for payment methods. */
export function humanLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Amounts arrive as decimal strings so nothing is lost to float rounding. */
export function formatMoney(value: string | number): string {
  const amount = Number(value);
  if (Number.isNaN(amount)) return String(value);

  return `NPR ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "09:00:00" reads as "09:00" everywhere in the ui. */
export function formatTime(value: string): string {
  return value.slice(0, 5);
}

export function formatDate(value: string): string {
  // a plain date gets pinned to midnight local, otherwise it is read as utc and
  // can render as the day before. full timestamps are already unambiguous.
  const date = value.includes("T") ? new Date(value) : new Date(`${value}T00:00:00`);

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toDateInput(date: Date): string {
  // not toISOString, that shifts to utc and can land on the wrong day
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function weekdayName(index: number): string {
  return WEEKDAYS[index] ?? "?";
}

export function formatWorkingDays(days: number[]): string {
  if (days.length === 0) return "No days set";
  if (days.length === 7) return "Every day";
  return days.map(weekdayName).join(", ");
}

/**
 * Quarter hour options for the time selects.
 *
 * A select rather than a native time input, so the therapist form matches
 * everything else and cannot be given 09:07 as a start time.
 */
export function timeOptions(fromHour = 6, toHour = 21, stepMinutes = 15) {
  const options: { value: string; label: string }[] = [];

  for (let minutes = fromHour * 60; minutes <= toHour * 60; minutes += stepMinutes) {
    const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mm = String(minutes % 60).padStart(2, "0");
    options.push({ value: `${hh}:${mm}:00`, label: `${hh}:${mm}` });
  }

  return options;
}
