import { createClient } from "@/lib/supabase/server";

export type ActivityInput = {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  label?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function recordActivity(input: ActivityInput) {
  await recordActivities([input]);
}

export async function recordActivities(items: ActivityInput[]) {
  if (items.length === 0) {
    return;
  }

  try {
    const supabase = await createClient();
    await supabase.from("activity_log").insert(
      items.map((item) => ({
        user_id: item.userId,
        action: item.action,
        entity_type: item.entityType,
        entity_id: item.entityId ?? null,
        label: item.label ?? null,
        metadata: item.metadata ?? null
      }))
    );
  } catch {
    // Activity logging should never block the primary user action.
  }
}
