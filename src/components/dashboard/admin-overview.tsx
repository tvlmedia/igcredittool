import { Badge } from "@/components/ui/badge";
import { Panel, SectionHeader } from "@/components/ui/panel";
import { formatCurrency, formatDate } from "@/lib/format";
import type { DashboardData, Profile } from "@/lib/types/domain";

export function AdminOverview({
  profiles,
  data
}: {
  profiles: Profile[];
  data: DashboardData;
}) {
  const totalsByUser = new Map<string, number>();

  data.transactions.forEach((transaction) => {
    const current = totalsByUser.get(transaction.user_id) ?? 0;
    const usd =
      transaction.currency === "USD"
        ? Number(transaction.original_amount)
        : Number(transaction.converted_amount_usd ?? transaction.original_amount);
    totalsByUser.set(transaction.user_id, current + usd);
  });

  return (
    <Panel>
      <SectionHeader eyebrow="Admin" title="Ambassador balances" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-y-2 text-left">
          <thead>
            <tr className="text-xs uppercase tracking-[0.18em] text-white/38">
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr key={profile.id} className="bg-white/[0.045] text-sm text-white/68">
                <td className="rounded-l-md px-3 py-4">
                  <p className="font-semibold text-white">
                    {profile.full_name ?? profile.email ?? "Unnamed"}
                  </p>
                  <p className="text-xs text-white/38">{profile.email}</p>
                </td>
                <td className="px-3 py-4">
                  <Badge>{profile.role}</Badge>
                </td>
                <td className="px-3 py-4">{formatDate(profile.created_at.slice(0, 10))}</td>
                <td className="rounded-r-md px-3 py-4 text-right font-semibold text-white">
                  {formatCurrency(Math.round(totalsByUser.get(profile.id) ?? 0), "USD")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
