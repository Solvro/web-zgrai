"use client";

import { ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrigin } from "@/hooks/use-hydrated";
import { inviteMessage, joinUrl } from "@/lib/dashboard/invite";
import type { Space } from "@/lib/dashboard/types";
import { CopyButton } from "../copy-button";

export function CodeLine({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/50 py-1.5 pr-1.5 pl-3 font-mono text-xs">
      <span className="flex-1 break-all">{value}</span>
      <CopyButton value={value} size="xs" />
    </div>
  );
}

// The code, the ready-to-paste message and the invite page link.
export function InviteDetails({ space }: { space: Space }) {
  const origin = useOrigin();
  const code = space.inviteCode ?? "";
  const message = inviteMessage({
    title: space.title,
    goal: space.goal,
    code,
    origin,
  });
  const link = joinUrl(origin, code);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Invite code</span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-3xl font-semibold tracking-widest">{code}</span>
          <CopyButton value={code} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Message to send out
          </span>
          <CopyButton value={message} label="Copy message" />
        </div>
        <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs whitespace-pre-wrap">
          {message}
        </pre>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          Invite page, with instructions for every agent
        </span>
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <CodeLine value={link} />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-auto"
            render={<a href={`/join/${code}`} target="_blank" rel="noreferrer" />}
            nativeButton={false}
          >
            <ExternalLinkIcon />
            Open
          </Button>
        </div>
      </div>
    </div>
  );
}
