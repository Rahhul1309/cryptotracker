/**
 * Tiny TTL cache. Pure and time-injectable so it can be unit-tested without
 * real clocks. Used to absorb bursts of loader revalidations (e.g. a user
 * mashing "Refresh") so slow-changing candle data isn't refetched every time.
 */

interface Entry<V> {
  value: V;
  /** Epoch ms after which the entry is considered stale. */
  expiresAt: number;
}

export class TtlCache<K, V> {
  private store = new Map<K, Entry<V>>();

  constructor(private readonly ttlMs: number) {}

  /** Return the cached value if present and not past its TTL, else undefined. */
  get(key: K, now: number): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (now >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: K, value: V, now: number): void {
    this.store.set(key, { value, expiresAt: now + this.ttlMs });
  }
}
