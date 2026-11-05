"use client";

import { useEffect, useState } from "react";

// Re-renders every `intervalMs`, for "2 min ago" labels and countdowns.
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const handle = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(handle);
  }, [intervalMs]);
  return now;
}
