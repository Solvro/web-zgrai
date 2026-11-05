"use client";

import { LinkIcon } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CopyMessageButton } from "@/components/start/invite-message";
import { InviteMessage } from "@/components/start/invite-card";

export function InviteDialog({ spaceId }: { spaceId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-3.5 text-sm font-medium text-ink transition-colors hover:bg-[#FAFAFA]">
        <LinkIcon className="size-[15px]" strokeWidth={1.8} />
        Invite
      </DialogTrigger>
      <DialogContent className="gap-4 rounded-[22px] p-[18px] sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-[-0.015em]">
            Invite more people
          </DialogTitle>
          <DialogDescription>
            Each person pastes this into their own AI agent, and it joins for
            them.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <InviteMessage spaceId={spaceId} initialMessage={null}>
            {(message) => <CopyMessageButton message={message} />}
          </InviteMessage>
        )}
      </DialogContent>
    </Dialog>
  );
}
