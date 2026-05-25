import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3, CircleDollarSign, LayoutDashboard, Shield, Sparkles, UserRound } from "lucide-react";
import { SignOutButton } from "@/components/layout/sign-out-button";
import type { Profile } from "@/lib/types/domain";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: CircleDollarSign },
  { href: "/insights", label: "Insights", icon: Sparkles },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/admin", label: "Admin", icon: Shield }
] as const;

export function AppShell({
  children,
  profile
}: {
  children: ReactNode;
  profile: Profile | null;
}) {
  const visibleNav = navItems.filter((item) => item.href !== "/admin" || profile?.role === "admin");

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-white/10 bg-carbon-950/86 px-4 py-4 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md border border-iron-400/25 bg-iron-400/10 text-iron-300">
            <BarChart3 size={22} />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-iron-300/80">
              IronGlass
            </p>
            <h1 className="text-lg font-semibold text-white">Credit Tracker</h1>
          </div>
        </div>

        <nav className="mt-7 grid grid-cols-2 gap-2 lg:grid-cols-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-white/64 transition hover:bg-white/[0.07] hover:text-white"
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-7 hidden rounded-lg border border-white/10 bg-white/[0.045] p-4 lg:block">
          <p className="text-xs uppercase tracking-[0.2em] text-white/38">Signed in as</p>
          <p className="mt-2 truncate text-sm font-semibold text-white">
            {profile?.full_name ?? profile?.email ?? "Ambassador"}
          </p>
          <p className="mt-1 text-xs capitalize text-iron-300/72">{profile?.role ?? "ambassador"}</p>
        </div>

        <div className="mt-4">
          <SignOutButton />
        </div>
      </aside>

      <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
