"use client";

import {
  ArrowLeftIcon,
  BrainIcon,
  EyeIcon,
  MessageCircleQuestionIcon,
  MoreHorizontalIcon,
  PencilIcon,
  TriangleAlertIcon,
  UserPlusIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { timeAgo } from "@/lib/dashboard/format";
import {
  currentSubproblem,
  openQuestions,
  progress,
} from "@/lib/dashboard/selectors";
import type { Space } from "@/lib/dashboard/types";
import { StatusBadge } from "../status-badge";
import type { AdminDialog } from "./admin-dialogs";

export function SpaceHeader({
  space,
  isAdmin,
  now,
  onOpenDialog,
}: {
  space: Space;
  isAdmin: boolean;
  now: number;
  onOpenDialog: (dialog: AdminDialog) => void;
}) {
  const canManage = isAdmin && space.status === "open";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back to spaces"
          render={<Link href="/spaces" />}
          nativeButton={false}
        >
          <ArrowLeftIcon />
        </Button>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{space.title}</h1>
            <StatusBadge status={space.status} />
            {!isAdmin && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <EyeIcon className="size-3.5" />
                Read-only view
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Goal:</span>{" "}
            {space.goal}
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenDialog("invite")}
            >
              <UserPlusIcon />
              Invite · <span className="font-mono">{space.inviteCode}</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Space actions"
                  />
                }
              >
                <MoreHorizontalIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onOpenDialog("goal")}>
                  <PencilIcon />
                  Change the goal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onOpenDialog("invite")}>
                  <UserPlusIcon />
                  Invite or new code
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onOpenDialog("close")}
                >
                  Close the space
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      <WhereWeAre space={space} now={now} />
    </div>
  );
}

// One line that answers "where are we now?".
function WhereWeAre({ space, now }: { space: Space; now: number }) {
  const { decided, total, percent } = progress(space);
  const current = currentSubproblem(space);
  const questions = openQuestions(space);
  const conflicts = space.subproblems.filter((s) => s.status === "conflict");

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-muted/60 px-4 py-2.5 text-sm">
      <div className="flex w-48 items-center gap-2">
        <Progress value={percent} className="flex-1" />
        <span className="text-xs whitespace-nowrap tabular-nums">
          {decided}/{total} decided
        </span>
      </div>
      {space.status === "closed" ? (
        <span className="text-muted-foreground">
          Closed {space.closedAt ? timeAgo(space.closedAt, now) : ""}. The goal
          is reached.
        </span>
      ) : (
        <>
          <span>
            <span className="text-muted-foreground">Now:</span>{" "}
            <span className="font-medium">
              {current?.title ?? "Wrapping up"}
            </span>
          </span>
          {conflicts.length > 0 && (
            <span className="flex items-center gap-1 text-amber-700 dark:text-amber-300">
              <TriangleAlertIcon className="size-4" />
              Conflict on {conflicts.map((c) => c.title).join(", ")}
            </span>
          )}
          {questions.length > 0 && (
            <span className="flex items-center gap-1">
              <MessageCircleQuestionIcon className="size-4 text-muted-foreground" />
              {questions.length} open{" "}
              {questions.length === 1 ? "question" : "questions"}
            </span>
          )}
          {space.masterThinking && (
            <span className="flex animate-pulse items-center gap-1 text-muted-foreground">
              <BrainIcon className="size-4" />
              The Master is thinking
            </span>
          )}
        </>
      )}
    </div>
  );
}
