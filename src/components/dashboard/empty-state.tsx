import { CircleDollarSign } from "lucide-react";

export function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-white/14 bg-white/[0.03] p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-md border border-iron-400/20 bg-iron-400/10 text-iron-300">
        <CircleDollarSign size={22} />
      </div>
      <h2 className="text-xl font-semibold text-white">No credits logged yet</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-white/52">
        Add a sale, expo, rental tour, expense or purchase. The charts and insights
        will fill up as your ambassador ledger grows.
      </p>
    </div>
  );
}
