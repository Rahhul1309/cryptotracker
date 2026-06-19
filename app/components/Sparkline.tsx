import { useId } from "react";

interface SparklineProps {
  data: number[] | null;
  /** Direction tint: positive → up color, else down color. */
  positive: boolean;
  width?: number;
  height?: number;
}

/**
 * Dependency-free SVG sparkline with a soft gradient area fill. Renders nothing
 * (a flat baseline) when there's no series, so layout stays stable.
 */
export function Sparkline({
  data,
  positive,
  width = 240,
  height = 56,
}: SparklineProps) {
  const gradientId = useId();
  const stroke = positive ? "var(--up)" : "var(--down)";

  if (!data || data.length < 2) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-14 w-full"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="var(--line)"
          strokeWidth="1.5"
          strokeDasharray="3 4"
        />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 3;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });

  const line = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const last = points[points.length - 1]!;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-14 w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={stroke} />
    </svg>
  );
}
