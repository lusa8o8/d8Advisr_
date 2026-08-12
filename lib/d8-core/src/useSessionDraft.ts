import { useCallback, useEffect, useState } from 'react';

type DraftEnvelope<T> = {
  version: number;
  value: T;
};

function readDraft<T>(key: string, version: number, fallback: T): T {
  if (!key || typeof sessionStorage === 'undefined') return fallback;
  try {
    const parsed = JSON.parse(sessionStorage.getItem(key) ?? 'null') as DraftEnvelope<T> | null;
    return parsed?.version === version ? parsed.value : fallback;
  } catch {
    return fallback;
  }
}

export function readSessionDraft<T>(key: string, version = 1): T | null {
  if (!key || typeof sessionStorage === 'undefined') return null;
  try {
    const parsed = JSON.parse(sessionStorage.getItem(key) ?? 'null') as DraftEnvelope<T> | null;
    return parsed?.version === version ? parsed.value : null;
  } catch {
    return null;
  }
}

export function writeSessionDraft<T>(key: string, value: T, version = 1) {
  if (!key || typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(key, JSON.stringify({ version, value } satisfies DraftEnvelope<T>));
  } catch {
    // Draft recovery is best-effort and must never make a form unusable.
  }
}

export function clearSessionDraft(key: string) {
  if (!key || typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Storage may be disabled by the browser; normal in-memory state still works.
  }
}

export function useSessionDraft<T>(key: string, fallback: T, version = 1) {
  const [value, setValue] = useState<T>(() => readDraft(key, version, fallback));

  useEffect(() => {
    setValue(readDraft(key, version, fallback));
  }, [key, version]);

  useEffect(() => {
    writeSessionDraft(key, value, version);
  }, [key, value, version]);

  const clear = useCallback(() => {
    clearSessionDraft(key);
  }, [key]);

  return [value, setValue, clear] as const;
}
