/**
 * Coin catalog — pure search/rank/filter logic. No React, no I/O.
 *
 * This file is provider-agnostic: it operates on plain `CatalogCoin` values
 * (symbol + name, optional volume) so it can be unit-tested with literal arrays
 * and reused regardless of where the catalog comes from. The Coinbase-shaped
 * fetch + mapping lives in `catalog-coinbase.server.ts`; this file never does
 * I/O. See CLAUDE.md → "app/lib/ is pure".
 */

/** A searchable coin in the catalog, independent of any live rate. */
export interface CatalogCoin {
  /** Ticker symbol, e.g. "BTC". Stable identity. */
  symbol: string;
  /** Human-readable name, e.g. "Bitcoin". */
  name: string;
  /** Trailing 24h volume, if known. Used by `topByVolume`; absent sorts last. */
  volume24h?: number;
}

/** Default cap on `searchCatalog` results. */
const DEFAULT_LIMIT = 25;

/**
 * Ranking tiers (lower = better). A coin's score is the best tier any of its
 * fields earns. Used to order matches so the most relevant rise to the top:
 * an exact symbol hit beats a symbol prefix, which beats a name prefix, which
 * beats any other substring match.
 */
const RANK_EXACT_SYMBOL = 0;
const RANK_SYMBOL_PREFIX = 1;
const RANK_NAME_PREFIX = 2;
const RANK_SUBSTRING = 3;
const RANK_NONE = 4;

/**
 * Compute the best (lowest) rank tier this coin earns for a normalized query.
 * Returns `RANK_NONE` when neither symbol nor name matches at all.
 */
function rankCoin(coin: CatalogCoin, q: string): number {
  const symbol = coin.symbol.toLowerCase();
  const name = coin.name.toLowerCase();

  if (symbol === q) return RANK_EXACT_SYMBOL;
  if (symbol.startsWith(q)) return RANK_SYMBOL_PREFIX;
  if (name.startsWith(q)) return RANK_NAME_PREFIX;
  if (symbol.includes(q) || name.includes(q)) return RANK_SUBSTRING;
  return RANK_NONE;
}

/**
 * Case-insensitive search over symbol OR name, ranked by relevance:
 * exact symbol > symbol prefix > name prefix > substring. Ties keep input
 * order (stable). Pure: never mutates `coins`. An empty/whitespace query
 * returns the first `limit` coins in their original order. Returns at most
 * `limit` results (default 25).
 */
export function searchCatalog(
  coins: readonly CatalogCoin[],
  query: string,
  limit: number = DEFAULT_LIMIT,
): CatalogCoin[] {
  const q = query.trim().toLowerCase();
  if (q === "") return coins.slice(0, limit);

  // Pair each coin with its rank and original index so we can sort by rank
  // while keeping ties stable (Array.prototype.sort is not guaranteed stable
  // across all inputs for our purposes — tie-break on index to be explicit).
  const ranked = coins
    .map((coin, index) => ({ coin, index, rank: rankCoin(coin, q) }))
    .filter((entry) => entry.rank !== RANK_NONE)
    .sort((a, b) => a.rank - b.rank || a.index - b.index);

  return ranked.slice(0, limit).map((entry) => entry.coin);
}

/**
 * Return the `n` highest-volume coins, descending. Coins without a known
 * `volume24h` sort last (after every coin that has one), keeping their relative
 * input order. Pure: never mutates `coins`. `n` larger than the list simply
 * returns the whole (sorted) list; `n <= 0` returns an empty array.
 */
export function topByVolume(
  coins: readonly CatalogCoin[],
  n: number,
): CatalogCoin[] {
  if (n <= 0) return [];

  const ranked = coins
    .map((coin, index) => ({ coin, index }))
    .sort((a, b) => {
      const va = a.coin.volume24h;
      const vb = b.coin.volume24h;
      const aHas = typeof va === "number";
      const bHas = typeof vb === "number";
      // Coins lacking volume always sort after those that have it.
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      if (aHas && bHas && va !== vb) return vb - va;
      // Equal volume, or both missing: preserve input order (stable).
      return a.index - b.index;
    });

  return ranked.slice(0, n).map((entry) => entry.coin);
}
