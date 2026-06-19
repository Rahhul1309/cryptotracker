/**
 * Display formatting for prices. Pure functions, safe to unit-test.
 * Chooses precision dynamically so both $68,000 and $0.00000123 read well.
 */

/**
 * Format a USD price with adaptive precision. Returns "—" for null.
 * `basePrecision` (user setting) sets the decimals for prices ≥ 1; sub-dollar
 * prices always get extra precision so tiny values stay legible.
 */
export function formatUsd(value: number | null, basePrecision = 2): string {
  if (value === null) return "—";
  const fractionDigits =
    value >= 1 ? basePrecision : value >= 0.01 ? Math.max(4, basePrecision) : 8;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Math.min(2, fractionDigits),
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Format a BTC-denominated price. Returns "—" for null (e.g. BTC itself). */
export function formatBtc(value: number | null): string {
  if (value === null) return "—";
  const formatted = value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });
  return `₿ ${formatted}`;
}

/** Format a signed percentage, e.g. +2.31% / -0.84%. Returns "—" for null. */
export function formatPct(value: number | null): string {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

/** Human-friendly "last updated" time from an ISO string. */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
