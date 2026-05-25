import { redirect } from "next/navigation";
import { FileArchive } from "lucide-react";
import { BackupReportsClient } from "@/components/reports/backup-reports-client";
import { ManualReportCard } from "@/components/reports/manual-report-card";
import { getCreditSnapshots } from "@/lib/data/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const snapshots = await getCreditSnapshots(user.id);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-iron-300/70">
            Safety archive
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Backup & Reports</h1>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-md border border-iron-400/25 bg-iron-400/10 text-iron-300">
          <FileArchive size={20} />
        </div>
      </div>

      <ManualReportCard />
      <BackupReportsClient snapshots={snapshots} />
    </div>
  );
}
