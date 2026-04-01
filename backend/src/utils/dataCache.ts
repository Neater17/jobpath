type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const DEFAULT_TTL_MS = Number(process.env.DATA_CACHE_TTL_MS ?? 5 * 60 * 1000);

const cache = new Map<string, CacheEntry<unknown>>();

export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS
): Promise<T> {
  const now = Date.now();
  const existing = cache.get(key) as CacheEntry<T> | undefined;

  if (existing && existing.expiresAt > now) {
    return existing.value;
  }

  const value = await fetcher();
  cache.set(key, {
    value,
    expiresAt: now + ttlMs,
  });

  return value;
}

export function setSharedCacheHeaders(res: { set: (field: string, value: string) => void }, maxAgeSeconds = 300) {
  res.set("Cache-Control", `public, max-age=${maxAgeSeconds}`);
}
