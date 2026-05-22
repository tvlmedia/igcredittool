import { KeyRound } from "lucide-react";
import { Panel } from "@/components/ui/panel";

export function SetupNotice() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <Panel className="max-w-2xl">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md border border-iron-400/25 bg-iron-400/10 text-iron-300">
          <KeyRound size={22} />
        </div>
        <h1 className="text-3xl font-semibold text-white">Supabase setup required</h1>
        <p className="mt-3 text-white/62">
          Add your Supabase project URL and anon key to `.env.local`, then run the SQL
          migration in `supabase/migrations/001_initial_schema.sql`.
        </p>
      </Panel>
    </main>
  );
}
