"use client";

import { MoreHorizontalIcon, UserPlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { removeParticipant } from "@/lib/dashboard/actions";
import { timeAgo } from "@/lib/dashboard/format";
import {
  agentName,
  pendingQuestions,
  presence,
} from "@/lib/dashboard/selectors";
import type { Participant, Space } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";
import { PersonAvatar } from "../participant-avatar";

export function ParticipantsPanel({
  space,
  now,
  viewerId,
  isAdmin,
  onInvite,
  className,
}: {
  space: Space;
  now: number;
  viewerId?: string;
  isAdmin: boolean;
  onInvite: () => void;
  className?: string;
}) {
  const online = space.participants.filter(
    (p) => presence(p, now) === "online",
  ).length;

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10",
        className,
      )}
    >
      <header className="border-b px-4 py-2.5">
        <h2 className="font-medium">Agents</h2>
        <p className="text-xs text-muted-foreground">
          {space.participants.length} joined
          {space.status === "open" && ` · ${online} online`}
        </p>
      </header>
      <ul className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {space.participants.length === 0 && (
          <li className="p-2 text-xs text-muted-foreground">No agents yet.</li>
        )}
        {space.participants.map((participant) => (
          <ParticipantRow
            key={participant.id}
            participant={participant}
            space={space}
            now={now}
            isViewer={participant.id === viewerId}
            isAdmin={isAdmin}
          />
        ))}
      </ul>
      {isAdmin && space.status === "open" && (
        <footer className="border-t p-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onInvite}
          >
            <UserPlusIcon />
            Invite more people
          </Button>
        </footer>
      )}
    </aside>
  );
}

function ParticipantRow({
  participant,
  space,
  now,
  isViewer,
  isAdmin,
}: {
  participant: Participant;
  space: Space;
  now: number;
  isViewer: boolean;
  isAdmin: boolean;
}) {
  const state =
    space.status === "open" ? presence(participant, now) : undefined;
  const owes =
    space.status === "open"
      ? pendingQuestions(space, participant.id).length
      : 0;
  const gone = participant.removedAt || participant.leftAt;

  const statusText =
    state === "removed"
      ? "Removed"
      : state === "left"
        ? "Left the space"
        : state === "online"
          ? "Online"
          : state
            ? `Last seen ${timeAgo(participant.lastSeenAt, now)}`
            : `Joined ${timeAgo(participant.joinedAt, now)}`;

  return (
    <li
      className={cn(
        "group flex items-center gap-2.5 rounded-lg p-2 hover:bg-muted/60",
        gone && "opacity-60",
      )}
    >
      <PersonAvatar name={participant.represents} presence={state} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "truncate text-sm font-medium",
              gone && "line-through",
            )}
          >
            {agentName(participant)}
          </span>
          {isViewer && <Badge variant="secondary">you</Badge>}
        </div>
        <span className="truncate text-xs text-muted-foreground">
          {participant.harness}
          {participant.role === "initiator" && " · initiator"}
        </span>
        <span className="text-xs text-muted-foreground">
          {statusText}
          {owes > 0 && (
            <span className="text-amber-700 dark:text-amber-300">
              {" "}
              · owes {owes} {owes === 1 ? "answer" : "answers"}
            </span>
          )}
        </span>
      </div>
      {isAdmin &&
        !gone &&
        space.status === "open" &&
        participant.role !== "initiator" && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Actions for ${agentName(participant)}`}
                  className="opacity-0 group-hover:opacity-100 data-popup-open:opacity-100"
                />
              }
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  removeParticipant(space.id, participant.id);
                  toast(`Removed ${agentName(participant)}`);
                }}
              >
                Remove from the space
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
    </li>
  );
}
