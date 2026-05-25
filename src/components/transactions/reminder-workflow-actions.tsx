"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, Clock, RotateCcw, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import {
  updateReminderWorkflow,
  type ReminderActionState
} from "@/lib/actions/reminders";

const initialState: ReminderActionState = {
  status: "idle",
  message: ""
};

export function ReminderWorkflowActions({
  reminderId,
  notes
}: {
  reminderId: string;
  notes: string | null;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateReminderWorkflow, initialState);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      router.refresh();
    }

    if (state.status === "error") {
      toast.error(state.message);
    }
  }, [router, state]);

  return (
    <form action={formAction} className="mt-4 grid gap-3">
      <input type="hidden" name="reminderId" value={reminderId} />
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
        <Input name="notes" placeholder="Notes" defaultValue={notes ?? ""} />
        <Input name="customDueDate" type="date" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          name="intent"
          value="followed_up"
          variant="secondary"
          disabled={pending}
          icon={<Send size={15} />}
        >
          Followed up
        </Button>
        <Button
          type="submit"
          name="intent"
          value="used"
          variant="secondary"
          disabled={pending}
          icon={<Check size={15} />}
        >
          Used
        </Button>
        <Button
          type="submit"
          name="intent"
          value="extend_1"
          variant="secondary"
          disabled={pending}
          icon={<Clock size={15} />}
        >
          +1 month
        </Button>
        <Button
          type="submit"
          name="intent"
          value="extend_3"
          variant="secondary"
          disabled={pending}
          icon={<RotateCcw size={15} />}
        >
          +3 months
        </Button>
        <Button
          type="submit"
          name="intent"
          value="extend_custom"
          variant="secondary"
          disabled={pending}
        >
          Custom date
        </Button>
        <Button
          type="submit"
          name="intent"
          value="ignored"
          variant="ghost"
          disabled={pending}
          icon={<X size={15} />}
        >
          Ignore
        </Button>
      </div>
    </form>
  );
}
