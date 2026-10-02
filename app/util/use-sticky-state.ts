import { type Dispatch, type SetStateAction, useEffect, useState } from "react";

export function useStickyState<T>(
  key: string,
  defaultValue: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readSticky(key, defaultValue));

  useEffect(
    function persist() {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Quota exceeded / private browsing — accept that this write is lost.
      }
    },
    [key, value],
  );

  return [value, setValue];
}

function readSticky<T>(key: string, defaultValue: T | (() => T)): T {
  const computeFallback = (): T =>
    typeof defaultValue === "function"
      ? (defaultValue as () => T)()
      : defaultValue;

  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return computeFallback();
    }
    return JSON.parse(raw) as T;
  } catch {
    return computeFallback();
  }
}
