'use client';

/**
 * In-memory cache for API responses. Cleared on logout.
 * Keyed by cache key; returns cached value if present, else fetches and stores.
 */
const cache = new Map<string, unknown>();

export function getCached<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function setCached<T>(key: string, value: T): void {
  cache.set(key, value);
}

export function clearApiCache(): void {
  cache.clear();
}

export async function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = getCached<T>(key);
  if (cached !== undefined) return cached;
  const value = await fetcher();
  setCached(key, value);
  return value;
}

/** Clear cache keys matching a prefix (e.g. 'patients:' to invalidate all patient data) */
export function clearCachePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
