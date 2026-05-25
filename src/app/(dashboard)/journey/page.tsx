import { redirect } from "next/navigation";
import { Aperture, BadgeDollarSign, Globe2, MapPin, Plane, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Panel, SectionHeader } from "@/components/ui/panel";
import { TravelMap, type TravelMapHomeBase } from "@/components/dashboard/travel-map";
import { formatCurrency, formatDate } from "@/lib/format";
import { getDashboardData, getOwnedLenses, getProfile } from "@/lib/data/queries";
import { createClient } from "@/lib/supabase/server";
import type { DashboardData, Profile, TimelineEvent } from "@/lib/types/domain";
import { transactionTypeLabels } from "@/lib/types/domain";

export const dynamic = "force-dynamic";

export default async function JourneyPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [data, profile, lenses] = await Promise.all([
    getDashboardData(user.id),
    getProfile(user.id),
    getOwnedLenses(user.id)
  ]);
  const stats = buildJourneyStats(data);
  const milestones = buildMilestones(data.transactions);
  const homeBase = buildHomeBase(profile);

  return (
    <div className="grid gap-5">
      <div className="rounded-xl border border-iron-400/16 bg-gradient-to-br from-iron-500/[0.12] via-white/[0.035] to-black/24 p-6 shadow-panel md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-iron-300/74">
          Ambassador Journey
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-white md:text-5xl">
          {profile?.full_name ?? "IronGlass Ambassador"}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-white/56">
          A cinematic log of credit earned, places visited, expos attended, sales closed,
          and lenses carried along the way.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-lg border border-iron-400/12 bg-gradient-to-b from-white/[0.05] to-black/18 p-4 shadow-panel"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-iron-400/18 bg-iron-400/[0.07] text-iron-300">
                <Icon size={18} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/36">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
            </div>
          );
        })}
      </div>

      <TravelMap transactions={data.transactions} homeBase={homeBase} />

      <div className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <Panel>
          <SectionHeader eyebrow="Milestones" title="Journey log" />
          <div className="grid gap-3">
            {milestones.map((milestone) => (
              <div
                key={`${milestone.date}-${milestone.title}`}
                className="rounded-lg border border-white/10 bg-black/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{formatDate(milestone.date)}</Badge>
                  <Badge>{milestone.meta}</Badge>
                </div>
                <p className="mt-3 font-semibold text-white">{milestone.title}</p>
                {milestone.detail ? (
                  <p className="mt-1 text-sm text-white/52">{milestone.detail}</p>
                ) : null}
              </div>
            ))}
            {milestones.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-white/[0.035] p-6 text-sm text-white/48">
                Add transactions to build the journey log.
              </div>
            ) : null}
          </div>
        </Panel>

        <Panel>
          <SectionHeader eyebrow="Lens room" title="Owned lenses showcase" />
          <div className="grid gap-3">
            {lenses.map((lens) => (
              <div
                key={lens.id}
                className="rounded-lg border border-iron-400/12 bg-gradient-to-b from-white/[0.045] to-black/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-iron-300/70">
                  {lens.brand}
                </p>
                <p className="mt-2 text-lg font-semibold text-white">{lens.model}</p>
                {lens.notes ? <p className="mt-2 text-sm leading-5 text-white/50">{lens.notes}</p> : null}
              </div>
            ))}
            {lenses.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-white/[0.035] p-6 text-sm text-white/48">
                Add owned lenses in Profile to build this showcase.
              </div>
            ) : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function buildJourneyStats(data: DashboardData) {
  const countries = uniqueValues(data.transactions.map((transaction) => transaction.country));
  const cities = uniqueValues(data.transactions.map((transaction) => transaction.city));

  return [
    {
      label: "Countries",
      value: String(countries.length),
      icon: Globe2
    },
    {
      label: "Cities",
      value: String(cities.length),
      icon: MapPin
    },
    {
      label: "Expos",
      value: String(data.transactions.filter((transaction) => transaction.type === "expo").length),
      icon: Plane
    },
    {
      label: "Sales",
      value: String(data.transactions.filter((transaction) => transaction.type === "sale").length),
      icon: Sparkles
    },
    {
      label: "Credit earned",
      value: formatCurrency(data.metrics.totalEarnedUsd, "USD"),
      icon: BadgeDollarSign
    }
  ];
}

function buildMilestones(transactions: TimelineEvent[]) {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const milestones: Array<{ date: string; title: string; meta: string; detail?: string }> = [];
  const seenTypes = new Set<string>();
  const seenCountries = new Set<string>();

  for (const transaction of sorted) {
    if (milestones.length === 0) {
      milestones.push({
        date: transaction.date,
        title: "Journey started",
        meta: transactionTypeLabels[transaction.type],
        detail: transaction.title
      });
    }

    if (!seenTypes.has(transaction.type)) {
      seenTypes.add(transaction.type);
      milestones.push({
        date: transaction.date,
        title: `First ${transactionTypeLabels[transaction.type].toLowerCase()}`,
        meta: transactionTypeLabels[transaction.type],
        detail: transaction.title
      });
    }

    const country = transaction.country?.trim();
    if (country && !seenCountries.has(country)) {
      seenCountries.add(country);
      milestones.push({
        date: transaction.date,
        title: `New country: ${country}`,
        meta: transaction.city ?? "Travel",
        detail: transaction.title
      });
    }
  }

  return milestones
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter((milestone, index, list) =>
      list.findIndex((item) => item.title === milestone.title && item.date === milestone.date) === index
    )
    .slice(0, 10);
}

function buildHomeBase(profile: Profile | null): TravelMapHomeBase | null {
  const latitude = parseCoordinate(profile?.home_base_latitude);
  const longitude = parseCoordinate(profile?.home_base_longitude);

  if (latitude === null || longitude === null) {
    return null;
  }

  return {
    label:
      [profile?.home_base_city, profile?.home_base_country].filter(Boolean).join(", ") ||
      "Configured origin",
    latitude,
    longitude
  };
}

function parseCoordinate(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function uniqueValues(values: Array<string | null>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]));
}
