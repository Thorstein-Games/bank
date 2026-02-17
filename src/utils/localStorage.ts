export const STORAGE_KEY_PREFIX = "bank-game";
export const DEFAULT_STORAGE_VERSION = 1;

export function buildVersionedStorageKey(
  baseKey: string,
  version = DEFAULT_STORAGE_VERSION
): string {
  return `${STORAGE_KEY_PREFIX}:v${version}:${baseKey}`;
}

export function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (value === null) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function safeJsonStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

export function readLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    return safeJsonParse(window.localStorage.getItem(key), fallback);
  } catch {
    return fallback;
  }
}

export function writeLocalStorage(key: string, value: unknown): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const serialized = safeJsonStringify(value);
  if (serialized === null) {
    return false;
  }

  try {
    window.localStorage.setItem(key, serialized);
    return true;
  } catch {
    return false;
  }
}

export function removeLocalStorage(key: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
