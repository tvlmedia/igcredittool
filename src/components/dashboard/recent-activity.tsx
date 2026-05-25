import { Aperture, FilePlus2, Pencil, RotateCcw, Trash2, UserRound } from "lucide-react";
import { Panel, SectionHeader } from "@/components/ui/panel";
import type { ActivityLog } from "@/lib/types/domain";

const actionLabels: Record<string, string> = {
  transaction_created: "Transaction created",
  transaction_edited: "Transaction edited",
  transaction_deleted: "Transaction deleted",
  transaction_restored: "Transaction restored",
  profile_updated: "Profile updated",
  owned_lens_added: "Lens added",
  owned_lens_removed: "Lens removed"
};

export function RecentActivity({ activities }: { activities: ActivityLog[] }) {
  return (
    <Panel>
      <SectionHeader
        eyebrow="Activity"
        title="Recent activity"
        action={<span className="text-sm text-white/45">{activities.length} events</span>}
      />

      <div className="grid gap-3">
        {activities.map((activity) => {
          const Icon = getActivityIcon(activity.action);

          return (
            <div
              key={activity.id}
              className="flex gap-3 rounded-lg border border-white/10 bg-black/18 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-iron-400/18 bg-iron-400/[0.08] text-iron-300">
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">
                    {actionLabels[activity.action] ?? activity.action}
                  </p>
                  <span className="text-xs text-white/40">{formatActivityTime(activity.created_at)}</span>
                </div>
                {activity.label ? (
                  <p className="mt-1 truncate text-sm text-white/54">{activity.label}</p>
                ) : null}
              </div>
            </div>
          );
        })}

        {activities.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-6 text-sm text-white/48">
            No activity recorded yet.
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

function getActivityIcon(action: string) {
  if (action === "transaction_created") {
    return FilePlus2;
  }

  if (action === "transaction_edited") {
    return Pencil;
  }

  if (action === "transaction_deleted") {
    return Trash2;
  }

  if (action === "transaction_restored") {
    return RotateCcw;
  }

  if (action.startsWith("owned_lens")) {
    return Aperture;
  }

  return UserRound;
}

function formatActivityTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
