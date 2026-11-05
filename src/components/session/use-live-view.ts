"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionView, ViewMessage } from "@/lib/dashboard/view";

const POLL_MS = 2500;
// The stream sends its first event right away and then pings every 15 s.
const FIRST_EVENT_MS = 8000;
const SILENCE_MS = 40_000;
const MAX_ERRORS = 3;

export type LiveTransport = "connecting" | "sse" | "polling";

function mergeMessages(current: ViewMessage[], next: ViewMessage[]) {
  if (next.length === 0) return current;
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const message of next) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

// Keeps the session view live: Server-Sent Events first, polling the view
// route when EventSource is missing, the stream errors out, or nothing
// arrives (e.g. a proxy that buffers the response).
export function useLiveView(initial: SessionView, beforeUpdate?: () => void) {
  const spaceId = initial.space.id;
  const [view, setView] = useState(initial);
  const [transport, setTransport] = useState<LiveTransport>("connecting");
  const cursor = useRef(initial.cursor);
  const closed = useRef(initial.space.status === "closed");
  const before = useRef(beforeUpdate);
  useEffect(() => {
    before.current = beforeUpdate;
  });

  const apply = useCallback((next: SessionView) => {
    before.current?.();
    cursor.current = Math.max(cursor.current, next.cursor);
    closed.current = next.space.status === "closed";
    setView((current) => ({
      ...next,
      messages: mergeMessages(current.messages, next.messages),
    }));
  }, []);

  const refresh = useCallback(async () => {
    const response = await fetch(
      `/api/spaces/${spaceId}/view?after=${cursor.current}`,
      { cache: "no-store" },
    );
    if (response.ok) apply((await response.json()) as SessionView);
  }, [spaceId, apply]);

  useEffect(() => {
    if (closed.current) return;
    let stopped = false;
    let source: EventSource | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    let errors = 0;
    let opened = false;

    const poll = async () => {
      if (stopped || closed.current) return;
      if (document.visibilityState === "visible") {
        await refresh().catch(() => {});
      }
      if (!stopped) pollTimer = setTimeout(poll, POLL_MS);
    };

    const fallBack = () => {
      if (stopped || pollTimer) return;
      clearTimeout(watchdog);
      source?.close();
      source = null;
      setTransport("polling");
      void poll();
    };

    if (typeof EventSource === "undefined") {
      fallBack();
    } else {
      source = new EventSource(
        `/api/spaces/${spaceId}/view/stream?after=${cursor.current}`,
      );
      watchdog = setTimeout(fallBack, FIRST_EVENT_MS);
      const alive = () => {
        errors = 0;
        opened = true;
        setTransport("sse");
        clearTimeout(watchdog);
        watchdog = setTimeout(fallBack, SILENCE_MS);
      };
      source.addEventListener("view", (event) => {
        alive();
        apply(JSON.parse((event as MessageEvent<string>).data));
      });
      source.addEventListener("ping", alive);
      source.addEventListener("closed", () => {
        clearTimeout(watchdog);
        source?.close();
      });
      // Before the first event an error means the stream doesn't work here;
      // after it, EventSource gets a few reconnects first.
      source.onerror = () => {
        errors += 1;
        if (
          !opened ||
          source?.readyState === EventSource.CLOSED ||
          errors >= MAX_ERRORS
        )
          fallBack();
      };
    }

    return () => {
      stopped = true;
      clearTimeout(watchdog);
      clearTimeout(pollTimer);
      source?.close();
    };
  }, [spaceId, apply, refresh]);

  return { view, transport, refresh };
}
