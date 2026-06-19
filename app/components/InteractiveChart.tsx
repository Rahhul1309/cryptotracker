import { useMemo, useRef, useState } from "react";
import { useId } from "react";
import { formatUsd } from "~/lib/format";

interface InteractiveChartProps {
  /** Hourly close prices, oldest→newest. */
  data: number[] | null;
  positive: boolean;
  height?: number;
}

/**
 * Line/area chart with a hover crosshair + tooltip showing the historical price
 * and how long ago that point was. Pure SVG + pointer math, no charting dep.
 *
 * Points are assumed hourly (matching the loader's candle granularity), so the
 * Nth-from-last point is "N hours ago". Hover snaps to the nearest point.
 */
export function InteractiveChart({
  data,
  positive,
  height = 160,
}: InteractiveChartProps) {
  const gradientId = useId();
  const stroke = positive ? "var(--up)" : "var(--down)";
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const width = 600;
  const pad = 6;

  const geom = useMemo(() => {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);
    const points = data.map((v, i) => {
      const x = i * stepX;
      const y = pad + (1 - (v - min) / range) * (height - pad * 2);
      return { x, y, v, i };
    });
    const line = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(" ");
    const area = `${line} L${width},${height} L0,${height} Z`;
    return { points, line, area, stepX };
  }, [data, height]);

  if (!geom) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-ink-2">
        No historical data available
      </div>
    );
  }

  const handleMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    const idx = Math.round(relX / geom.stepX);
    setHoverIdx(Math.max(0, Math.min(geom.points.length - 1, idx)));
  };

  const active = hoverIdx !== null ? geom.points[hoverIdx] : null;
  const hoursAgo =
    hoverIdx !== null ? geom.points.length - 1 - hoverIdx : null;
  const agoLabel =
    hoursAgo === null
      ? ""
      : hoursAgo === 0
        ? "now"
        : `${hoursAgo}h ago`;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="h-40 w-full touch-none"
        preserveAspectRatio="none"
        onPointerMove={handleMove}
        onPointerLeave={() => setHoverIdx(null)}
        role="img"
        aria-label="Interactive price history chart"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.3" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={geom.area} fill={`url(#${gradientId})`} />
        <path
          d={geom.line}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {active ? (
          <>
            <line
              x1={active.x}
              y1={0}
              x2={active.x}
              y2={height}
              stroke="var(--ink-2)"
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={active.x} cy={active.y} r="4" fill={stroke} stroke="var(--bg-1)" strokeWidth="2" />
          </>
        ) : null}
      </svg>

      {active ? (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-line bg-bg-2/95 px-2.5 py-1.5 text-center shadow-lg backdrop-blur"
          style={{
            left: `${(active.x / width) * 100}%`,
          }}
        >
          <div className="font-mono-num text-sm font-semibold">
            {formatUsd(active.v)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-ink-2">
            {agoLabel}
          </div>
        </div>
      ) : (
        <div className="absolute right-0 top-0 text-[10px] uppercase tracking-wider text-ink-2">
          hover to inspect
        </div>
      )}
    </div>
  );
}
