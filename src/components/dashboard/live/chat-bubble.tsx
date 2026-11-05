"use client";

import {
  ArrowRightIcon,
  ChevronDownIcon,
  CornerDownRightIcon,
  LockIcon,
  PinIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { clockTime, countdown } from "@/lib/dashboard/format";
import {
  actorName,
  actorParticipant,
  findActivity,
  findParticipant,
  proposalDecision,
  proposalTally,
  questionStatus,
} from "@/lib/dashboard/selectors";
import type { Activity, ActivityType, Space } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";
import {
  MasterAvatar,
  PersonAvatar,
  SystemAvatar,
} from "../participant-avatar";

const TYPE_LABEL: Partial<Record<ActivityType, string>> = {
  question: "Question",
  proposal: "Proposal",
  vote: "Vote",
  decision: "Decision",
  shared_context: "Shared context",
  retracted_context: "Retracted context",
};

// Joins, leaves and system events: a thin line instead of a bubble.
export function isSystemLine(activity: Activity) {
  return (
    activity.actor.kind === "system" ||
    activity.type === "joined" ||
    activity.type === "left"
  );
}

export function ChatBubble({
  activity,
  space,
  viewerId,
  now,
}: {
  activity: Activity;
  space: Space;
  viewerId?: string;
  now: number;
}) {
  if (isSystemLine(activity)) {
    return <SystemLine activity={activity} space={space} />;
  }

  const participant = actorParticipant(space, activity.actor);
  const isMaster = activity.actor.kind === "master";
  const isMine = participant !== undefined && participant.id === viewerId;
  const isPrivate = activity.visibility === "private";
  // Private details are for the author and the Master only.
  const showContent = Boolean(activity.content) && (!isPrivate || isMine);
  const typeLabel =
    isPrivate && activity.type === "message"
      ? "Private note"
      : TYPE_LABEL[activity.type];

  return (
    <div
      className={cn(
        "flex max-w-[min(92%,44rem)] gap-2",
        isMine && "flex-row-reverse self-end",
      )}
    >
      <div className="pt-5">
        {isMaster ? (
          <MasterAvatar size="sm" />
        ) : (
          <PersonAvatar name={participant?.represents ?? "?"} size="sm" />
        )}
      </div>
      <div className={cn("flex min-w-0 flex-col gap-1", isMine && "items-end")}>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 px-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {actorName(space, activity.actor)}
            {isMine && " (you)"}
          </span>
          <InteractionPath
            activity={activity}
            space={space}
            harness={participant?.harness}
          />
          <span>{clockTime(activity.createdAt)}</span>
        </div>

        <div
          className={cn(
            "flex flex-col gap-2 rounded-2xl px-3 py-2 text-sm",
            isMaster
              ? "rounded-tl-sm bg-primary/[0.06] ring-1 ring-primary/15"
              : "bg-muted",
            !isMaster && (isMine ? "rounded-tr-sm" : "rounded-tl-sm"),
            activity.type === "decision" &&
              "bg-emerald-50 ring-1 ring-emerald-300 dark:bg-emerald-950/40 dark:ring-emerald-800",
            isPrivate && "border border-dashed bg-transparent",
          )}
        >
          <div className="flex items-start gap-2">
            {activity.type === "decision" && (
              <PinIcon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            )}
            {isPrivate && (
              <LockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            )}
            <p className="flex-1">{activity.summary}</p>
            {typeLabel && (
              <Badge variant="outline" className="shrink-0 bg-background">
                {typeLabel}
              </Badge>
            )}
          </div>

          <ReplyReference activity={activity} space={space} />
          {activity.type === "question" && (
            <QuestionStatus activity={activity} space={space} now={now} />
          )}
          {activity.type === "proposal" && (
            <ProposalTally activity={activity} space={space} />
          )}
          {showContent && activity.content && (
            <Details
              content={activity.content}
              label={isPrivate ? "What only the Master sees" : "Full message"}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// The agent -> MCP -> Master path of one interaction.
function InteractionPath({
  activity,
  space,
  harness,
}: {
  activity: Activity;
  space: Space;
  harness?: string;
}) {
  const target =
    activity.actor.kind === "master"
      ? activity.addressedTo?.length
        ? activity.addressedTo
            .map((id) => findParticipant(space, id)?.represents)
            .filter(Boolean)
            .join(", ")
        : "everyone"
      : activity.visibility === "private"
        ? "Master only"
        : "Master";

  return (
    <span className="flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px]">
      {harness && <span>{harness}</span>}
      {harness && <ArrowRightIcon className="size-3" />}
      <span className="text-foreground">{activity.tool}</span>
      <ArrowRightIcon className="size-3" />
      <span>{target}</span>
    </span>
  );
}

function ReplyReference({
  activity,
  space,
}: {
  activity: Activity;
  space: Space;
}) {
  const original = findActivity(space, activity.replyTo);
  if (!original || activity.type === "decision") return null;
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <CornerDownRightIcon className="size-3 shrink-0" />
      <span className="truncate">
        {original.type === "proposal" ? "On the proposal" : "Answers"}:{" "}
        {original.summary}
      </span>
    </div>
  );
}

function QuestionStatus({
  activity,
  space,
  now,
}: {
  activity: Activity;
  space: Space;
  now: number;
}) {
  const status = questionStatus(space, activity);
  const names = (ids: string[]) =>
    ids
      .map((id) => findParticipant(space, id)?.represents)
      .filter(Boolean)
      .join(", ");
  const left = activity.deadline ? activity.deadline - now : undefined;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span>
        Answered by {status.answeredBy.length} of {status.addressed.length}
      </span>
      {!status.closed && status.waitingFor.length > 0 && (
        <span>· waiting for {names(status.waitingFor)}</span>
      )}
      {!status.closed && left !== undefined && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 font-medium",
            left > 0
              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
              : "bg-destructive/10 text-destructive",
          )}
        >
          {left > 0 ? `${countdown(left)} left` : "Deadline passed"}
        </span>
      )}
    </div>
  );
}

function ProposalTally({
  activity,
  space,
}: {
  activity: Activity;
  space: Space;
}) {
  const tally = proposalTally(space, activity);
  const total = tally.reduce((sum, option) => sum + option.voters.length, 0);
  const decided = proposalDecision(space, activity);
  const max = Math.max(0, ...tally.map((option) => option.voters.length));

  return (
    <div className="flex flex-col gap-1.5">
      {tally.map(({ option, voters }) => (
        <div key={option} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span
              className={cn(
                decided && voters.length === max && max > 0 && "font-medium",
              )}
            >
              {option}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="flex -space-x-1">
                {voters.map((id) => (
                  <PersonAvatar
                    key={id}
                    name={findParticipant(space, id)?.represents ?? "?"}
                    size="sm"
                  />
                ))}
              </span>
              <span className="w-4 text-right tabular-nums">
                {voters.length}
              </span>
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: total ? `${(voters.length / total) * 100}%` : 0 }}
            />
          </div>
        </div>
      ))}
      <span className="text-xs text-muted-foreground">
        {total} {total === 1 ? "vote" : "votes"}
        {decided && " · decided"}
      </span>
    </div>
  );
}

function Details({ content, label }: { content: string; label: string }) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronDownIcon className="size-3 transition-transform group-data-[panel-open]:rotate-180" />
        {label}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className="mt-1.5 rounded-lg bg-background/70 p-2 text-xs whitespace-pre-wrap">
          {content}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}

function SystemLine({ activity, space }: { activity: Activity; space: Space }) {
  const participant = actorParticipant(space, activity.actor);
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 py-1 text-center text-xs text-muted-foreground">
      {participant ? (
        <PersonAvatar name={participant.represents} size="sm" />
      ) : (
        <SystemAvatar size="sm" />
      )}
      <span>
        {activity.summary}
        {activity.content && activity.type === "system" && (
          <span className="text-foreground">: {activity.content}</span>
        )}
      </span>
      {activity.tool && (
        <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px]">
          {activity.tool}
        </span>
      )}
      <span>{clockTime(activity.createdAt)}</span>
    </div>
  );
}
