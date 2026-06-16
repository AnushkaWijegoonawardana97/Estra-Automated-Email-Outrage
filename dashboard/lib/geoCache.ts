const TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T): void {
  store.set(key, {
    value,
    expiresAt: Date.now() + TTL_MS,
  });
}
