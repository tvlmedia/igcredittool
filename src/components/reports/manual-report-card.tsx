"use client";

import { useActionState, useEffect } from "react";
import toast from "react-hot-toast";
import { FileText, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel, SectionHeader } from "@/components/ui/panel";
import {
  generateManualMonthlyReport,
  type ManualReportActionState
} from "@/lib/actions/reports";

const initialState: ManualReportActionState = {
  status: "idle",
  message: ""
};

export function ManualReportCard() {
  const [state, formAction, pending] = useActionState(
    generateManualMonthlyReport,
    initialState
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
    }

    if (state.warning) {
      toast(state.warning);
    }

    if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <Panel>
      <SectionHeader eyebrow="Backup" title="Monthly report" />
      <form action={formAction} className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm leading-6 text-white/56">
            Generate a current month-to-date snapshot with the same reserve and FX logic used by
            the dashboard.
          </p>
          <p className="mt-2 text-xs leading-5 text-white/42">
            Email delivery uses Resend. If email is unavailable, the snapshot is still saved for
            backup.
          </p>
          <label className="mt-3 inline-flex items-center gap-2 text-sm text-white/68">
            <input
              name="sendEmail"
              type="checkbox"
              value="true"
              className="h-4 w-4 rounded border-white/20 bg-black/40 text-iron-400 focus:ring-iron-400/35"
            />
            <Mail size={15} className="text-iron-300/80" />
            Email me a copy
          </label>
        </div>
        <Button type="submit" disabled={pending} icon={<FileText size={16} />}>
          {pending ? "Generating..." : "Generate monthly report now"}
        </Button>
      </form>
      <ReportStatus state={state} />
    </Panel>
  );
}

function ReportStatus({ state }: { state: ManualReportActionState }) {
  if (state.status === "idle" && !state.warning) {
    return null;
  }

  const tone =
    state.status === "error"
      ? "border-red-300/20 bg-red-500/[0.08] text-red-100/82"
      : state.warning
        ? "border-iron-400/24 bg-iron-400/[0.08] text-iron-100/82"
        : "border-volt-300/20 bg-volt-400/[0.08] text-volt-100/82";

  return (
    <div className={`mt-4 rounded-md border px-3 py-2 text-sm leading-5 ${tone}`}>
      <p>{state.message}</p>
      {state.warning ? <p className="mt-1 text-white/62">{state.warning}</p> : null}
    </div>
  );
}
