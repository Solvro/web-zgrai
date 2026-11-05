"use client";

import { RefreshCwIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  closeSpace,
  regenerateInvite,
  suggestedSummary,
  updateGoal,
} from "@/lib/dashboard/actions";
import type { Space } from "@/lib/dashboard/types";
import { InviteDetails } from "../invite/invite-details";

export type AdminDialog = "invite" | "goal" | "close" | null;

// The initiator's admin actions. Each one mirrors an initiator MCP tool from
// CONCEPT.md: create_invite, revoke_invite, update_goal and close_space.
export function AdminDialogs({
  space,
  open,
  onOpenChange,
}: {
  space: Space;
  open: AdminDialog;
  onOpenChange: (dialog: AdminDialog) => void;
}) {
  const close = () => onOpenChange(null);
  const dialogProps = (dialog: Exclude<AdminDialog, null>) => ({
    open: open === dialog,
    onOpenChange: (next: boolean) => onOpenChange(next ? dialog : null),
  });

  return (
    <>
      <Dialog {...dialogProps("invite")}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invite more people</DialogTitle>
            <DialogDescription>
              Anyone with the code can join. Agents that already joined stay
              when you replace it.
            </DialogDescription>
          </DialogHeader>
          <InviteDetails space={space} />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                regenerateInvite(space.id);
                toast("New invite code. The old one no longer works.");
              }}
            >
              <RefreshCwIcon />
              Replace the code
            </Button>
            <DialogClose render={<Button />}>Done</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog {...dialogProps("goal")}>
        <DialogContent className="sm:max-w-lg">
          <EditGoalForm space={space} onDone={close} />
        </DialogContent>
      </Dialog>

      <Dialog {...dialogProps("close")}>
        <DialogContent className="sm:max-w-lg">
          <CloseSpaceForm space={space} onDone={close} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditGoalForm({ space, onDone }: { space: Space; onDone: () => void }) {
  const [goal, setGoal] = useState(space.goal);
  return (
    <>
      <DialogHeader>
        <DialogTitle>Change the goal</DialogTitle>
        <DialogDescription>
          The Master tells every agent about the new goal.
        </DialogDescription>
      </DialogHeader>
      <Textarea rows={3} value={goal} onChange={(event) => setGoal(event.target.value)} />
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button
          disabled={!goal.trim() || goal === space.goal}
          onClick={() => {
            updateGoal(space.id, goal.trim());
            onDone();
          }}
        >
          Save and announce
        </Button>
      </DialogFooter>
    </>
  );
}

function CloseSpaceForm({ space, onDone }: { space: Space; onDone: () => void }) {
  const [summary, setSummary] = useState(() => suggestedSummary(space));
  return (
    <>
      <DialogHeader>
        <DialogTitle>Close the space</DialogTitle>
        <DialogDescription>
          Agents stop negotiating and get this summary. Usually the Master
          closes the space itself once the goal is reached.
        </DialogDescription>
      </DialogHeader>
      <Textarea
        rows={4}
        value={summary}
        placeholder="What was decided?"
        onChange={(event) => setSummary(event.target.value)}
      />
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
        <Button
          variant="destructive"
          onClick={() => {
            closeSpace(space.id, summary.trim());
            onDone();
          }}
        >
          Close the space
        </Button>
      </DialogFooter>
    </>
  );
}
