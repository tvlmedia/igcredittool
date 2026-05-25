"use client";

import { useMemo, useState } from "react";
import {
  geoEqualEarth,
  geoGraticule,
  geoInterpolate,
  geoPath,
  type GeoProjection
} from "d3-geo";
import { feature, mesh } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import { MapPinned } from "lucide-react";
import landTopologyData from "world-atlas/land-110m.json";
import countriesTopologyData from "world-atlas/countries-110m.json";
import { Panel, SectionHeader } from "@/components/ui/panel";
import { formatCurrency, formatDate } from "@/lib/format";
import type { TimelineEvent } from "@/lib/types/domain";
import { transactionTypeColors, transactionTypeLabels } from "@/lib/types/domain";

const width = 1000;
const height = 520;
const homeBase = {
  label: "Beek en Donk, Netherlands",
  latitude: 51.535,
  longitude: 5.63
};

type MapPoint = {
  id: string;
  title: string;
  type: TimelineEvent["type"];
  city: string | null;
  country: string | null;
  location: string;
  latitude: number;
  longitude: number;
  amount: string;
  date: string;
  projected: [number, number];
};

type WorldGeometry = Topology<{ land: GeometryCollection; countries: GeometryCollection }>;

const landTopology = landTopologyData as unknown as WorldGeometry;
const countriesTopology = countriesTopologyData as unknown as WorldGeometry;
const land = feature(landTopology, landTopology.objects.land);
const countryBorders = mesh(
  countriesTopology,
  countriesTopology.objects.countries,
  (a, b) => a !== b
);

export function TravelMap({ transactions }: { transactions: TimelineEvent[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const projection = useMemo(() => createProjection(), []);
  const paths = useMemo(() => buildMapPaths(projection), [projection]);
  const home = projection([homeBase.longitude, homeBase.latitude]) ?? [512, 170];
  const points = useMemo(
    () =>
      transactions
        .map((transaction) => toMapPoint(transaction, projection))
        .filter((point): point is MapPoint => Boolean(point)),
    [projection, transactions]
  );
  const hoveredPoint = points.find((point) => point.id === hoveredId) ?? null;

  return (
    <Panel>
      <SectionHeader
        eyebrow="Travel map"
        title="Global credit routes"
        action={
          <span className="inline-flex items-center gap-2 text-sm text-white/45">
            <MapPinned size={16} />
            {points.length} locations
          </span>
        }
      />

      <div className="relative overflow-hidden rounded-lg border border-white/10 bg-[#080a0d] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Cinematic world travel map with transaction locations"
          className="block aspect-[1.92/1] w-full"
        >
          <defs>
            <radialGradient id="travel-vignette" cx="50%" cy="44%" r="72%">
              <stop offset="0%" stopColor="#182028" />
              <stop offset="58%" stopColor="#0d1116" />
              <stop offset="100%" stopColor="#050608" />
            </radialGradient>
            <filter id="route-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="point-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <pattern id="fine-grid" width="42" height="42" patternUnits="userSpaceOnUse">
              <path d="M 42 0 L 0 0 0 42" fill="none" stroke="rgba(255,255,255,0.035)" />
            </pattern>
          </defs>

          <style>{`
            .travel-route {
              stroke-dasharray: 8 12;
              animation: route-flow 9s linear infinite;
            }

            .travel-pulse {
              animation: map-pulse 2.8s ease-out infinite;
              transform-box: fill-box;
              transform-origin: center;
            }

            @keyframes route-flow {
              to { stroke-dashoffset: -120; }
            }

            @keyframes map-pulse {
              0% { opacity: 0.42; transform: scale(0.8); }
              72% { opacity: 0; transform: scale(2.8); }
              100% { opacity: 0; transform: scale(2.8); }
            }
          `}</style>

          <rect width={width} height={height} fill="url(#travel-vignette)" />
          <rect width={width} height={height} fill="url(#fine-grid)" opacity="0.78" />
          <path d={paths.graticule} fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="0.8" />
          <path d={paths.sphere} fill="rgba(255,255,255,0.018)" stroke="rgba(255,255,255,0.08)" />
          <path d={paths.land} fill="rgba(129,139,151,0.18)" stroke="rgba(255,255,255,0.09)" />
          <path d={paths.borders} fill="none" stroke="rgba(255,255,255,0.075)" strokeWidth="0.55" />

          {points.map((point) => {
            const color = transactionTypeColors[point.type];

            return (
              <path
                key={`route-${point.id}`}
                d={buildRoutePath(projection, point)}
                className="travel-route"
                fill="none"
                stroke={color.core}
                strokeWidth={hoveredId === point.id ? "1.85" : "1.15"}
                strokeLinecap="round"
                filter="url(#route-glow)"
                opacity={hoveredId && hoveredId !== point.id ? "0.28" : "0.62"}
              />
            );
          })}

          <g transform={`translate(${home[0]} ${home[1]})`}>
            <circle r="15" fill="rgba(245,158,66,0.08)" stroke="rgba(245,158,66,0.22)" />
            <circle r="5.5" fill="#f59e42" filter="url(#point-glow)" />
            <circle r="2.2" fill="#fff7ed" />
            <text x="14" y="-12" fill="rgba(255,255,255,0.72)" fontSize="12" letterSpacing="0.04em">
              Home base
            </text>
          </g>

          {points.map((point) => {
            const color = transactionTypeColors[point.type];
            const [x, y] = point.projected;

            return (
              <g
                key={point.id}
                transform={`translate(${x} ${y})`}
                onMouseEnter={() => setHoveredId(point.id)}
                onMouseLeave={() => setHoveredId(null)}
                onFocus={() => setHoveredId(point.id)}
                onBlur={() => setHoveredId(null)}
                tabIndex={0}
                role="button"
                aria-label={`${point.title} in ${point.location}`}
                className="cursor-pointer outline-none"
              >
                <circle className="travel-pulse" r="7" fill={color.glow} />
                <circle r="9" fill={color.glow} filter="url(#point-glow)" />
                <circle r={hoveredId === point.id ? "5.6" : "4.6"} fill={color.core} stroke="#090b0e" strokeWidth="2" />
              </g>
            );
          })}

          {hoveredPoint ? <MapTooltip point={hoveredPoint} /> : null}
        </svg>
      </div>

      {points.length === 0 ? (
        <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.035] p-5 text-sm text-white/48">
          Add city, country, latitude, and longitude to transactions to plot travel routes.
        </div>
      ) : (
        <div className="mt-4 grid gap-2 md:grid-cols-5">
          {Object.entries(transactionTypeColors).map(([type, color]) => (
            <div
              key={type}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-white/52"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color.core }} />
              {transactionTypeLabels[type as TimelineEvent["type"]]}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function createProjection() {
  return geoEqualEarth().fitExtent(
    [
      [44, 38],
      [956, 452]
    ],
    { type: "Sphere" }
  );
}

function buildMapPaths(projection: GeoProjection) {
  const path = geoPath(projection);
  const graticule = geoGraticule().step([20, 20]);

  return {
    sphere: path({ type: "Sphere" }) ?? "",
    graticule: path(graticule()) ?? "",
    land: path(land) ?? "",
    borders: path(countryBorders) ?? ""
  };
}

function toMapPoint(transaction: TimelineEvent, projection: GeoProjection): MapPoint | null {
  if (transaction.latitude === null || transaction.longitude === null) {
    return null;
  }

  const latitude = parseCoordinate(transaction.latitude);
  const longitude = parseCoordinate(transaction.longitude);

  if (
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  const projected = projection([longitude, latitude]);
  if (!projected) {
    return null;
  }

  return {
    id: transaction.id,
    title: transaction.title,
    type: transaction.type,
    city: transaction.city,
    country: transaction.country,
    location:
      transaction.location_label ||
      [transaction.city, transaction.country].filter(Boolean).join(", ") ||
      transaction.title,
    latitude,
    longitude,
    amount: formatCurrency(Number(transaction.original_amount), transaction.currency),
    date: formatDate(transaction.date),
    projected
  };
}

function buildRoutePath(projection: GeoProjection, point: MapPoint) {
  const interpolate = geoInterpolate(
    [homeBase.longitude, homeBase.latitude],
    [point.longitude, point.latitude]
  );
  const coordinates = Array.from({ length: 36 }, (_, index) => {
    const projected = projection(interpolate(index / 35));
    return projected ? `${index === 0 ? "M" : "L"} ${projected[0].toFixed(1)} ${projected[1].toFixed(1)}` : "";
  });

  return coordinates.filter(Boolean).join(" ");
}

function MapTooltip({ point }: { point: MapPoint }) {
  const [x, y] = point.projected;
  const tooltipWidth = 220;
  const tooltipHeight = 116;
  const tooltipX = Math.min(Math.max(x + 18, 18), width - tooltipWidth - 18);
  const tooltipY = Math.min(Math.max(y - tooltipHeight - 18, 18), height - tooltipHeight - 18);

  return (
    <g transform={`translate(${tooltipX} ${tooltipY})`} pointerEvents="none">
      <rect
        width={tooltipWidth}
        height={tooltipHeight}
        rx="10"
        fill="rgba(8,10,13,0.92)"
        stroke={transactionTypeColors[point.type].border}
      />
      <text x="14" y="24" fill="rgba(255,255,255,0.9)" fontSize="13" fontWeight="600">
        {truncate(point.title, 26)}
      </text>
      <text x="14" y="45" fill={transactionTypeColors[point.type].core} fontSize="11" letterSpacing="0.04em">
        {transactionTypeLabels[point.type].toUpperCase()}
      </text>
      <text x="14" y="66" fill="rgba(255,255,255,0.62)" fontSize="12">
        {truncate([point.city, point.country].filter(Boolean).join(", ") || point.location, 30)}
      </text>
      <text x="14" y="88" fill="rgba(255,255,255,0.78)" fontSize="12">
        {point.amount}
      </text>
      <text x="118" y="88" fill="rgba(255,255,255,0.5)" fontSize="12">
        {point.date}
      </text>
    </g>
  );
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function parseCoordinate(value: string | number | null) {
  if (value === null) {
    return null;
  }

  const normalized = String(value).trim().replace(",", ".");
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
