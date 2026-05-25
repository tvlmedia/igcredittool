"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordActivity } from "@/lib/activity";
import { hasSupabaseEnv } from "@/lib/env";
import { addMonthsToDate } from "@/lib/reminders";
import { createClient } from "@/lib/supabase/server";
import type { ReminderStatus } from "@/lib/types/domain";

export type ReminderActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const reminderWorkflowSchema = z.object({
  reminderId: z.string().min(1),
  intent: z.enum(["followed_up", "used", "ignored", "extend_1", "extend_3", "extend_custom"]),
  customDueDate: z.string().optional(),
  notes: z.string().optional()
});

export async function updateReminderWorkflow(
  _previousState: ReminderActionState,
  formData: FormData
): Promise<ReminderActionState> {
  if (!hasSupabaseEnv()) {
    return {
      status: "error",
      message: "Supabase environment variables are missing."
    };
  }

  const parsed = reminderWorkflowSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Reminder update could not be read." };
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message: "You need to be logged in."
    };
  }

  const { data: reminder, error: readError } = await supabase
    .from("reminders")
    .select("id,title,due_date,notes")
    .eq("id", parsed.data.reminderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError) {
    return { status: "error", message: readError.message };
  }

  if (!reminder) {
    return { status: "error", message: "Reminder was not found." };
  }

  const notes = cleanString(parsed.data.notes);
  const updatePayload: {
    status: ReminderStatus;
    due_date?: string;
    notes?: string | null;
  } = {
    status: getNextStatus(parsed.data.intent)
  };

  if (notes) {
    updatePayload.notes = notes;
  }

  if (parsed.data.intent === "extend_1" || parsed.data.intent === "extend_3") {
    updatePayload.due_date = addMonthsToDate(
      reminder.due_date,
      parsed.data.intent === "extend_1" ? 1 : 3
    );
  }

  if (parsed.data.intent === "extend_custom") {
    const customDueDate = cleanString(parsed.data.customDueDate);
    if (!customDueDate) {
      return { status: "error", message: "Choose a custom extension date." };
    }

    updatePayload.due_date = customDueDate;
  }

  const { error } = await supabase
    .from("reminders")
    .update(updatePayload)
    .eq("id", parsed.data.reminderId)
    .eq("user_id", user.id);

  if (error) {
    return { status: "error", message: error.message };
  }

  await recordActivity({
    userId: user.id,
    action: "reminder_updated",
    entityType: "reminder",
    entityId: parsed.data.reminderId,
    label: reminder.title,
    metadata: {
      status: updatePayload.status,
      dueDate: updatePayload.due_date ?? reminder.due_date
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/reports");

  return {
    status: "success",
    message: "Reminder updated."
  };
}

function getNextStatus(intent: z.infer<typeof reminderWorkflowSchema>["intent"]): ReminderStatus {
  if (intent === "followed_up" || intent === "used" || intent === "ignored") {
    return intent;
  }

  return "extended";
}

function cleanString(value: string | undefined) {
  return typeof value === "string" ? value.trim() : "";
}
