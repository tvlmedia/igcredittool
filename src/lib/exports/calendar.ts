import type { TimelineEvent } from "@/lib/types/domain";

export function buildGoogleCalendarUrl(event: TimelineEvent) {
  const startDate = event.date.replaceAll("-", "");
  const endDate = addDays(event.date, 1).replaceAll("-", "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${startDate}/${endDate}`,
    details: event.description ?? "IronGlass ambassador event"
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}
