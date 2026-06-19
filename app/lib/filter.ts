import type { CryptoRate } from "~/types/crypto";

/**
 * Pure, case-insensitive filter by name or symbol.
 * Empty/whitespace query returns the list unchanged.
 */
export function filterCryptos<T extends Pick<CryptoRate, "name" | "symbol">>(
  cryptos: readonly T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (q === "") return [...cryptos];
  return cryptos.filter(
    (c) =>
      c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q),
  );
}
