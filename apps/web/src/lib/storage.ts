const STORAGE_NAMESPACE = "hermis-atlas";

function getStorage() {
  if (typeof window === "undefined") return undefined;
  return window.localStorage;
}

export function loadState<T>(key: string, fallback: T): T {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(`${STORAGE_NAMESPACE}:${key}`);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn("storage: load failed", error);
    return fallback;
  }
}

export function saveState<T>(key: string, value: T) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(`${STORAGE_NAMESPACE}:${key}`, JSON.stringify(value));
  } catch (error) {
    console.warn("storage: save failed", error);
  }
}

export function clearState(key: string) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(`${STORAGE_NAMESPACE}:${key}`);
  } catch (error) {
    console.warn("storage: clear failed", error);
  }
}
