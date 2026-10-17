/**
 * IST (Asia/Kolkata) Date & Time Utilities
 * Guaranteed strictly in Asia/Kolkata timezone, never user's local browser timezone.
 */

export const IST_TIMEZONE = "Asia/Kolkata";

/**
 * Formats date into standard IST string: e.g. "15:30 IST, 17 Oct" or "15:30 IST, 17 Oct 2026"
 */
export function formatToIST(
  dateInput: string | number | Date | null | undefined,
  includeSeconds: boolean = false
): string {
  if (!dateInput) return "N/A";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    const timeFormatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: IST_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      second: includeSeconds ? "2-digit" : undefined,
      hour12: false,
    });

    const dateFormatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: IST_TIMEZONE,
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const timeStr = timeFormatter.format(d);
    const dateParts = dateFormatter.formatToParts(d);
    const day = dateParts.find((p) => p.type === "day")?.value || "";
    const month = dateParts.find((p) => p.type === "month")?.value || "";

    return `${timeStr} IST, ${day} ${month}`;
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats time only in IST: e.g. "09:15 AM IST" or "15:30 IST"
 */
export function formatISTTime(
  dateInput: string | number | Date | null | undefined,
  use12Hour: boolean = true
): string {
  if (!dateInput) return "N/A";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    return new Intl.DateTimeFormat("en-IN", {
      timeZone: IST_TIMEZONE,
      hour: "numeric",
      minute: "2-digit",
      hour12: use12Hour,
    }).format(d) + " IST";
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats day name, date and time in IST: e.g. "Monday, 19 Oct at 9:15 AM IST"
 */
export function formatISTNextOpen(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return "next trading session at 9:15 AM IST";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "next trading session at 9:15 AM IST";

    const weekday = new Intl.DateTimeFormat("en-IN", {
      timeZone: IST_TIMEZONE,
      weekday: "long",
    }).format(d);

    const dateStr = new Intl.DateTimeFormat("en-IN", {
      timeZone: IST_TIMEZONE,
      day: "numeric",
      month: "short",
    }).format(d);

    const time = new Intl.DateTimeFormat("en-IN", {
      timeZone: IST_TIMEZONE,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);

    return `${weekday} (${dateStr}) at ${time} IST`;
  } catch {
    return "next trading session at 9:15 AM IST";
  }
}

/**
 * Formats seconds into human countdown mm:ss or hh:mm:ss
 */
export function formatCountdown(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const remainingSeconds = sec % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(remainingSeconds).padStart(2, "0")}s`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}
