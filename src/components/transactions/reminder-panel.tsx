import { Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Panel, SectionHeader } from "@/components/ui/panel";
import { formatDate } from "@/lib/format";
import type { Reminder } from "@/lib/types/domain";

export function ReminderPanel({ reminders }: { reminders: Reminder[] }) {
  const openReminders = reminders.filter((reminder) => reminder.status === "open").slice(0, 6);

  return (
    <Panel>
      <SectionHeader eyebrow="Follow-up" title="Open reminders" />
      <div className="grid gap-3">
        {openReminders.map((reminder) => (
          <div
            key={reminder.id}
            className="flex items-start justify-between gap-4 rounded-md border border-white/10 bg-white/[0.045] p-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <Clock3 size={15} className="text-iron-300" />
                <p className="font-semibold text-white">{reminder.title}</p>
              </div>
              {reminder.notes ? (
                <p className="mt-2 text-sm leading-5 text-white/52">{reminder.notes}</p>
              ) : null}
            </div>
            <Badge>{formatDate(reminder.due_date)}</Badge>
          </div>
        ))}
        {openReminders.length === 0 ? (
          <div className="rounded-md border border-white/10 bg-white/[0.035] p-5 text-sm text-white/48">
            No open reminders.
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
