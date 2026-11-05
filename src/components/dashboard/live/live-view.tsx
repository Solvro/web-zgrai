"use client";

import { useState } from "react";
import { useNow } from "@/hooks/use-now";
import { viewerParticipant } from "@/lib/dashboard/selectors";
import { useDashboardState } from "@/lib/dashboard/store";
import type { Space } from "@/lib/dashboard/types";
import { type AdminDialog, AdminDialogs } from "./admin-dialogs";
import { BoardPanel } from "./board-panel";
import { LiveChat } from "./live-chat";
import { ParticipantsPanel } from "./participants-panel";
import { SpaceHeader } from "./space-header";

// Stage 2 of the dashboard: following the space live. The initiator gets
// admin actions; participants get the same view, read-only.
export function LiveView({ space }: { space: Space }) {
  const { viewer } = useDashboardState();
  const now = useNow(1000);
  const [dialog, setDialog] = useState<AdminDialog>(null);
  const isAdmin = viewer === "initiator";
  const viewerId = viewerParticipant(space, viewer)?.id;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 p-4 lg:h-[calc(100dvh-3.5rem)]">
      <SpaceHeader
        space={space}
        isAdmin={isAdmin}
        now={now}
        onOpenDialog={setDialog}
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 *:min-w-0 lg:grid-cols-[260px_minmax(0,1fr)_340px]">
        <ParticipantsPanel
          className="order-3 lg:order-1"
          space={space}
          now={now}
          viewerId={viewerId}
          isAdmin={isAdmin}
          onInvite={() => setDialog("invite")}
        />
        <div className="order-1 flex min-h-0 flex-col lg:order-2">
          <LiveChat space={space} viewerId={viewerId} now={now} />
        </div>
        <BoardPanel className="order-2 lg:order-3" space={space} now={now} />
      </div>
      {isAdmin && (
        <AdminDialogs space={space} open={dialog} onOpenChange={setDialog} />
      )}
    </div>
  );
}
