"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type AccountUser } from "@/components/account-menu";
import { AppHeader } from "@/components/app-header";
import type { SessionView, ViewMessage } from "@/lib/dashboard/view";
import { Chat } from "./chat";
import { InviteDialog } from "./invite-dialog";
import { MasterInput } from "./master-input";
import { PeopleRow } from "./people-row";
import { SummaryPanel } from "./summary-panel";

const POLL_MS = 2500;

function mergeMessages(current: ViewMessage[], next: ViewMessage[]) {
  if (next.length === 0) return current;
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const message of next) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

function nearBottom() {
  const { scrollY, innerHeight } = window;
  return document.documentElement.scrollHeight - (scrollY + innerHeight) < 240;
}

// 07 · The live session. Polls the view route for new messages, presence and
// the steps; the admin can write to the Master.
export function LiveSession({
  initial,
  user,
}: {
  initial: SessionView;
  user: AccountUser;
}) {
  const [view, setView] = useState(initial);
  const cursor = useRef(initial.cursor);
  const stick = useRef(true);
  const spaceId = initial.space.id;

  const poll = useCallback(async () => {
    const response = await fetch(
      `/api/spaces/${spaceId}/view?after=${cursor.current}`,
      { cache: "no-store" },
    );
    if (!response.ok) return;
    const next = (await response.json()) as SessionView;
    stick.current = nearBottom();
    cursor.current = Math.max(cursor.current, next.cursor);
    setView((current) => ({
      ...next,
      messages: mergeMessages(current.messages, next.messages),
    }));
  }, [spaceId]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const loop = async () => {
      if (document.visibilityState === "visible") {
        await poll().catch(() => {});
      }
      if (!stopped) timer = setTimeout(loop, POLL_MS);
    };
    timer = setTimeout(loop, POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [poll]);

  const lastId = view.messages.at(-1)?.id;
  useEffect(() => {
    if (stick.current) window.scrollTo({ top: document.body.scrollHeight });
  }, [lastId]);

  const admin = view.me.role === "initiator";
  const open = view.space.status === "open";

  return (
    <div className="min-h-svh bg-white">
      <AppHeader
        user={user}
        title={view.space.title}
        actions={admin && open ? <InviteDialog spaceId={spaceId} /> : null}
      />
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-9 px-4 py-7 sm:px-6">
        <section
          aria-label="Chat"
          className="flex min-w-0 flex-[999_1_560px] flex-col gap-[22px]"
        >
          <PeopleRow people={view.people} />
          <Chat
            messages={view.messages}
            people={view.people}
            steps={view.steps}
            viewer={view.me}
          />
          {view.space.status === "closed" && (
            <p className="rounded-2xl bg-panel px-4 py-3 text-center text-sm text-grey">
              This session is closed.
            </p>
          )}
          {admin && open && (
            <MasterInput
              spaceId={spaceId}
              onSent={() => {
                stick.current = true;
                void poll();
              }}
            />
          )}
        </section>
        <SummaryPanel view={view} />
      </div>
    </div>
  );
}
