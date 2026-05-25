"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const visibleNav = navItems.filter((item) => item.href !== "/admin" || profile?.role === "admin");

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[286px_1fr]">
      <aside className="border-b border-iron-400/12 bg-black/72 px-4 py-4 shadow-[inset_-1px_0_0_rgba(230,132,46,0.13)] backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:border-iron-400/12 lg:px-5 lg:py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md border border-iron-400/35 bg-gradient-to-b from-iron-400/18 to-iron-600/8 text-iron-300 shadow-glow">
            <BarChart3 size={22} />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-iron-300/82">
              IronGlass
            </p>
            <h1 className="text-lg font-semibold text-white">Credit Tracker</h1>
          </div>
        </div>

        <nav className="mt-7 grid grid-cols-2 gap-2 lg:grid-cols-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "group flex min-h-11 items-center gap-3 rounded-md border px-3 text-sm font-semibold transition duration-200",
                  active
                    ? "border-iron-400/28 bg-gradient-to-r from-iron-400/16 to-white/[0.035] text-white shadow-[inset_3px_0_0_rgba(230,132,46,0.92)]"
                    : "border-transparent text-white/58 hover:border-white/10 hover:bg-white/[0.055] hover:text-white"
                )}
              >
                <span
                  className={clsx(
                    "flex h-7 w-7 items-center justify-center rounded border transition",
                    active
                      ? "border-iron-400/32 bg-iron-400/12 text-iron-300"
                      : "border-white/8 bg-white/[0.035] text-white/46 group-hover:text-iron-300"
                  )}
                >
                  <Icon size={15} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-7 hidden rounded-lg border border-iron-400/14 bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] lg:block">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/34">Signed in as</p>
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
