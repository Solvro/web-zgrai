"use client";

import { useEffect, useRef } from "react";
import { type AccountUser } from "@/components/account-menu";
import { AppHeader } from "@/components/app-header";
import type { SessionView } from "@/lib/dashboard/view";
import { Chat } from "./chat";
import { InviteDialog } from "./invite-dialog";
import { MasterInput } from "./master-input";
import { MasterPaused } from "./master-paused";
import { PeopleRow } from "./people-row";
import { SummaryPanel } from "./summary-panel";
import { useLiveView } from "./use-live-view";

function nearBottom() {
  const { scrollY, innerHeight } = window;
  return document.documentElement.scrollHeight - (scrollY + innerHeight) < 240;
}

// 07 · The live session, kept live over SSE with a polling fallback. The
// admin can write to the Master.
export function LiveSession({
  initial,
  user,
}: {
  initial: SessionView;
  user: AccountUser;
}) {
  const stick = useRef(true);
  const spaceId = initial.space.id;
  const { view, transport, refresh } = useLiveView(initial, () => {
    stick.current = nearBottom();
  });

  const lastId = view.messages.at(-1)?.id;
  useEffect(() => {
    if (stick.current) window.scrollTo({ top: document.body.scrollHeight });
  }, [lastId]);

  const admin = view.me.role === "initiator";
  const open = view.space.status === "open";

  return (
    <div className="min-h-svh bg-white" data-live={transport}>
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
          {open && view.masterPaused && (
            <MasterPaused
              spaceId={spaceId}
              admin={admin}
              onContinued={() => void refresh()}
            />
          )}
          {admin && open && (
            <MasterInput
              spaceId={spaceId}
              onSent={() => {
                stick.current = true;
                void refresh();
              }}
            />
          )}
        </section>
        <SummaryPanel view={view} />
      </div>
    </div>
  );
}
