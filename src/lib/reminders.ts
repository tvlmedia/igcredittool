import type { Reminder, ReminderStatus } from "@/lib/types/domain";

export const activeReminderStatuses: ReminderStatus[] = ["open", "followed_up", "extended"];

export function isActiveReminder(reminder: Pick<Reminder, "status">) {
  return activeReminderStatuses.includes(reminder.status);
}

export function addMonthsToDate(dateValue: string, months: number) {
  const [year, month, day] = dateValue.split("-").map(Number);
  if (!year || !month || !day) {
    return "";
  }

  const targetMonth = month - 1 + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const targetMonthIndex = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();
  const targetDate = new Date(Date.UTC(targetYear, targetMonthIndex, Math.min(day, lastDay)));

  return targetDate.toISOString().slice(0, 10);
}
