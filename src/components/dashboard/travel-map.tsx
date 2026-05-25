import { MapPinned } from "lucide-react";
import { Panel, SectionHeader } from "@/components/ui/panel";
import type { TimelineEvent } from "@/lib/types/domain";
import { transactionTypeLabels } from "@/lib/types/domain";

const homeBase = {
  label: "Beek en Donk, Netherlands",
  latitude: 51.535,
  longitude: 5.63
};

type MapPoint = {
  id: string;
  title: string;
  type: TimelineEvent["type"];
  location: string;
  latitude: number;
  longitude: number;
};

export function TravelMap({ transactions }: { transactions: TimelineEvent[] }) {
  const points = transactions
    .map(toMapPoint)
    .filter((point): point is MapPoint => Boolean(point));
  const home = project(homeBase.latitude, homeBase.longitude);

  return (
    <Panel>
      <SectionHeader
        eyebrow="Travel map"
        title="Transaction locations"
        action={
          <span className="inline-flex items-center gap-2 text-sm text-white/45">
            <MapPinned size={16} />
            {points.length} locations
          </span>
        }
      />

      <div className="overflow-hidden rounded-lg border border-white/10 bg-carbon-950">
        <svg
          viewBox="0 0 1000 500"
          role="img"
          aria-label="World map with transaction locations"
          className="block aspect-[2/1] w-full"
        >
          <rect width="1000" height="500" fill="#10141a" />
          <MapGrid />
          <WorldShapes />

          {points.map((point) => {
            const target = project(point.latitude, point.longitude);
            const arc = buildArcPath(home, target);

            return (
              <g key={`arc-${point.id}`}>
                <path
                  d={arc}
                  fill="none"
                  stroke="rgba(225,180,95,0.44)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          <circle cx={home.x} cy={home.y} r="5" fill="#77f2d5" />
          <circle cx={home.x} cy={home.y} r="10" fill="none" stroke="#77f2d5" opacity="0.28" />
          <text x={home.x + 12} y={home.y - 8} fill="rgba(255,255,255,0.72)" fontSize="13">
            Home base
          </text>

          {points.map((point) => {
            const target = project(point.latitude, point.longitude);

            return (
              <g key={point.id}>
                <circle
                  cx={target.x}
                  cy={target.y}
                  r="5"
                  fill="#e1b45f"
                  stroke="#10141a"
                  strokeWidth="2"
                >
                  <title>{`${point.title} - ${point.location}`}</title>
                </circle>
              </g>
            );
          })}
        </svg>
      </div>

      {points.length > 0 ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {points.slice(0, 8).map((point) => (
            <div
              key={`location-${point.id}`}
              className="rounded-lg border border-white/10 bg-white/[0.035] p-3"
            >
              <p className="text-sm font-semibold text-white">{point.location}</p>
              <p className="mt-1 text-xs text-white/45">
                {transactionTypeLabels[point.type]} - {point.title}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.035] p-5 text-sm text-white/48">
          Add latitude and longitude to transactions to plot travel points.
        </div>
      )}
    </Panel>
  );
}

function toMapPoint(transaction: TimelineEvent): MapPoint | null {
  if (transaction.latitude === null || transaction.longitude === null) {
    return null;
  }

  const latitude = Number(transaction.latitude);
  const longitude = Number(transaction.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    id: transaction.id,
    title: transaction.title,
    type: transaction.type,
    location:
      transaction.location_label ||
      [transaction.city, transaction.country].filter(Boolean).join(", ") ||
      transaction.title,
    latitude,
    longitude
  };
}

function project(latitude: number, longitude: number) {
  return {
    x: ((longitude + 180) / 360) * 1000,
    y: ((90 - latitude) / 180) * 500
  };
}

function buildArcPath(start: { x: number; y: number }, end: { x: number; y: number }) {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const controlY = midY - Math.max(35, distance * 0.18);

  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} Q ${midX.toFixed(1)} ${controlY.toFixed(
    1
  )} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}

function MapGrid() {
  return (
    <g opacity="0.16" stroke="white" strokeWidth="1">
      {[125, 250, 375, 500, 625, 750, 875].map((x) => (
        <line key={`x-${x}`} x1={x} x2={x} y1="0" y2="500" />
      ))}
      {[100, 200, 300, 400].map((y) => (
        <line key={`y-${y}`} x1="0" x2="1000" y1={y} y2={y} />
      ))}
    </g>
  );
}

function WorldShapes() {
  return (
    <g fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.08)" strokeWidth="1">
      <path d="M102 167 C136 105 238 78 312 120 C363 149 375 205 336 242 C300 277 245 256 217 300 C190 342 139 323 144 270 C148 229 75 225 102 167 Z" />
      <path d="M285 304 C330 316 359 370 346 419 C331 472 282 491 255 446 C231 406 249 347 285 304 Z" />
      <path d="M444 145 C500 103 615 105 697 134 C785 165 874 144 918 197 C955 242 893 277 811 259 C737 242 689 287 603 269 C525 252 473 286 430 248 C395 217 399 177 444 145 Z" />
      <path d="M470 237 C527 212 591 242 609 301 C627 363 579 424 516 410 C464 398 436 338 448 288 C452 269 458 251 470 237 Z" />
      <path d="M739 328 C793 301 869 324 893 365 C914 402 868 431 803 420 C751 411 713 366 739 328 Z" />
      <path d="M432 134 C462 116 512 121 535 150 C494 164 461 165 432 134 Z" />
    </g>
  );
}
