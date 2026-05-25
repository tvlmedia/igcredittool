import { NextResponse, type NextRequest } from "next/server";
import { cronSecret } from "@/lib/env";
import { sendMonthlyReportEmail } from "@/lib/reports/email";
import {
  generateMonthlyCreditReport,
  markCreditSnapshotEmailed,
  saveCreditSnapshot
} from "@/lib/reports/monthly";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
};

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id,email,full_name")
    .not("email", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = [];
  for (const profile of ((profiles ?? []) as ProfileRow[])) {
    if (!profile.email) {
      continue;
    }

    try {
      const report = await generateMonthlyCreditReport({
        userId: profile.id,
        client: supabase
      });
      const snapshot = await saveCreditSnapshot(report, supabase);

      try {
        await sendMonthlyReportEmail({ to: profile.email, report });
        await markCreditSnapshotEmailed(snapshot.id, supabase);
        results.push({ userId: profile.id, email: profile.email, status: "sent" });
      } catch (emailError) {
        await logReportFailure(supabase, profile.id, profile.email, emailError);
        results.push({
          userId: profile.id,
          email: profile.email,
          status: "email_failed",
          error: errorMessage(emailError)
        });
      }
    } catch (reportError) {
      await logReportFailure(supabase, profile.id, profile.email, reportError);
      results.push({
        userId: profile.id,
        email: profile.email,
        status: "report_failed",
        error: errorMessage(reportError)
      });
    }
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    results
  });
}

function isAuthorized(request: NextRequest) {
  if (!cronSecret) {
    return false;
  }

  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const querySecret = request.nextUrl.searchParams.get("secret") ?? "";

  return bearer === cronSecret || querySecret === cronSecret;
}

async function logReportFailure(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  email: string,
  error: unknown
) {
  try {
    await supabase.from("activity_log").insert({
      user_id: userId,
      action: "monthly_report_failed",
      entity_type: "monthly_report",
      label: email,
      metadata: { error: errorMessage(error) }
    });
  } catch {
    // Report generation should keep moving even if error logging is unavailable.
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}
