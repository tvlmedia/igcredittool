"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { recordActivity } from "@/lib/activity";
import { hasSupabaseEnv } from "@/lib/env";
import {
  formatReportMonth,
  generateMonthlyCreditReport,
  getCurrentMonthPeriod,
  markCreditSnapshotEmailed,
  saveCreditSnapshot
} from "@/lib/reports/monthly";
import { sendCreditSnapshotEmail, sendMonthlyReportEmail } from "@/lib/reports/email";
import { createClient } from "@/lib/supabase/server";
import type { CreditSnapshot } from "@/lib/types/domain";

export type ManualReportActionState = {
  status: "idle" | "success" | "error";
  message: string;
  warning?: string;
};

const manualReportSchema = z.object({
  sendEmail: z.string().optional()
});

const resendReportSchema = z.object({
  snapshotId: z.string().min(1)
});

export async function generateManualMonthlyReport(
  _previousState: ManualReportActionState,
  formData: FormData
): Promise<ManualReportActionState> {
  if (!hasSupabaseEnv()) {
    return {
      status: "error",
      message: "Supabase environment variables are missing."
    };
  }

  const parsed = manualReportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Report request could not be read." };
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

  try {
    const period = getCurrentMonthPeriod();
    const report = await generateMonthlyCreditReport({
      userId: user.id,
      period
    });
    const snapshot = await saveCreditSnapshot(report);
    const reportLabel = formatReportMonth(report.periodStart);
    const shouldSendEmail = parsed.data.sendEmail === "true";
    let warning: string | undefined;

    if (shouldSendEmail) {
      const recipient = report.profile.email || user.email || null;

      if (!recipient) {
        warning = "Monthly report saved, but no email address is available.";
      } else {
        try {
          await sendMonthlyReportEmail({ to: recipient, report });
          await markCreditSnapshotEmailed(snapshot.id);
        } catch (error) {
          warning =
            error instanceof Error
              ? `Monthly report saved, but email failed: ${error.message}`
              : "Monthly report saved, but email failed.";
        }
      }
    }

    await recordActivity({
      userId: user.id,
      action: "monthly_report_generated",
      entityType: "credit_snapshot",
      entityId: snapshot.id,
      label: report.title,
      metadata: {
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        emailed: shouldSendEmail && !warning
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/profile");

    return {
      status: "success",
      message: `Monthly report generated for ${reportLabel}.`,
      warning
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Monthly report could not be generated."
    };
  }
}

export async function resendMonthlyReportEmail(
  _previousState: ManualReportActionState,
  formData: FormData
): Promise<ManualReportActionState> {
  if (!hasSupabaseEnv()) {
    return {
      status: "error",
      message: "Supabase environment variables are missing."
    };
  }

  const parsed = resendReportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Report snapshot could not be read." };
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

  try {
    const { data: snapshot, error: snapshotError } = await supabase
      .from("credit_snapshots")
      .select("*")
      .eq("id", parsed.data.snapshotId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (snapshotError) {
      throw new Error(snapshotError.message);
    }

    if (!snapshot) {
      return { status: "error", message: "Monthly snapshot was not found." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .maybeSingle();
    const recipient =
      (typeof profile?.email === "string" && profile.email.trim()) || user.email || null;

    if (!recipient) {
      return {
        status: "error",
        message: "No email address is available for this profile."
      };
    }

    await sendCreditSnapshotEmail({
      to: recipient,
      snapshot: snapshot as CreditSnapshot
    });
    await markCreditSnapshotEmailed(snapshot.id);
    await recordActivity({
      userId: user.id,
      action: "monthly_report_resent",
      entityType: "credit_snapshot",
      entityId: snapshot.id,
      label: `Credit Report - ${snapshot.month}/${snapshot.year}`
    });

    revalidatePath("/reports");
    revalidatePath("/dashboard");

    return {
      status: "success",
      message: "Monthly report email resent."
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Monthly report email could not be sent."
    };
  }
}
