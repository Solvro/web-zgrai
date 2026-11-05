"use client";

import { ArrowRightIcon, BrainIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useNow } from "@/hooks/use-now";
import { timeAgo } from "@/lib/dashboard/format";
import {
  activeParticipants,
  actorName,
  currentSubproblem,
  lastActivity,
  openQuestions,
  presence,
  progress,
} from "@/lib/dashboard/selectors";
import { useDashboardState } from "@/lib/dashboard/store";
import type { Space } from "@/lib/dashboard/types";
import { PersonAvatar } from "./participant-avatar";
import { StatusBadge } from "./status-badge";

export function SpacesList() {
  const { spaces, order } = useDashboardState();
  const list = order.flatMap((id) => (spaces[id] ? [spaces[id]] : []));
  const sections = [
    { title: "Live", spaces: list.filter((s) => s.status === "open") },
    { title: "Drafts", spaces: list.filter((s) => s.status === "draft") },
    { title: "Closed", spaces: list.filter((s) => s.status === "closed") },
  ].filter((section) => section.spaces.length);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Spaces</h1>
        <p className="text-sm text-muted-foreground">
          Problems your agent is working on together with other people&apos;s
          agents.
        </p>
      </div>

      {sections.length === 0 && (
        <Card className="items-center py-12 text-center">
          <CardHeader className="w-full">
            <CardTitle>No spaces yet</CardTitle>
            <CardDescription>
              Describe a problem that involves several people, and the Master
              helps you shape it.
            </CardDescription>
          </CardHeader>
          <Button render={<Link href="/spaces/new" />} nativeButton={false}>
            <PlusIcon />
            New space
          </Button>
        </Card>
      )}

      {sections.map((section) => (
        <section key={section.title} className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            {section.title} · {section.spaces.length}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {section.spaces.map((space) => (
              <SpaceCard key={space.id} space={space} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SpaceCard({ space }: { space: Space }) {
  const now = useNow(10_000);

  return (
    <Link href={`/spaces/${space.id}`} className="group">
      <Card className="h-full transition-shadow group-hover:ring-foreground/25">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-1">
              {space.title || "Untitled draft"}
            </CardTitle>
            <StatusBadge status={space.status} />
          </div>
          <CardDescription className="line-clamp-2">
            {space.goal || space.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          {space.status === "draft" ? (
            <DraftPreview space={space} />
          ) : (
            <SpacePreview space={space} now={now} />
          )}
        </CardContent>
        <CardFooter className="justify-between text-xs text-muted-foreground">
          <span>
            {space.status === "closed" && space.closedAt
              ? `Closed ${timeAgo(space.closedAt, now)}`
              : space.status === "draft"
                ? `Started ${timeAgo(space.createdAt, now)}`
                : `Opened ${timeAgo(space.openedAt ?? space.createdAt, now)}`}
          </span>
          <span className="flex items-center gap-1 text-foreground">
            {space.status === "draft" ? "Continue shaping" : "Open"}
            <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}

function DraftPreview({ space }: { space: Space }) {
  const lastMaster = space.shaping.messages.findLast(
    (m) => m.from === "master",
  );
  return (
    <div className="flex gap-2 rounded-lg bg-muted/60 p-2.5 text-xs">
      <BrainIcon className="mt-0.5 size-3.5 shrink-0" />
      <p className="line-clamp-3">
        {space.masterThinking
          ? "The Master is thinking…"
          : (lastMaster?.text ?? "Waiting for your description.")}
      </p>
    </div>
  );
}

function SpacePreview({ space, now }: { space: Space; now: number }) {
  const participants = activeParticipants(space);
  const { decided, total, percent } = progress(space);
  const current = currentSubproblem(space);
  const last = lastActivity(space);
  const waiting = openQuestions(space).length;
  const online = participants.filter(
    (p) => presence(p, now) === "online",
  ).length;

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="flex -space-x-1.5 *:ring-2 *:ring-card *:rounded-full">
          {participants.slice(0, 6).map((p) => (
            <PersonAvatar key={p.id} name={p.represents} size="sm" />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {participants.length} {participants.length === 1 ? "agent" : "agents"}
          {space.status === "open" && ` · ${online} online`}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            {space.status === "open" && current
              ? `Now: ${current.title}`
              : "Subproblems"}
          </span>
          <span>
            {decided} of {total} decided
          </span>
        </div>
        <Progress value={percent} />
      </div>

      {space.status === "closed" && space.summary ? (
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {space.summary}
        </p>
      ) : (
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {space.masterThinking ? (
            <span className="animate-pulse">The Master is thinking…</span>
          ) : last ? (
            <>
              <span className="font-medium text-foreground">
                {actorName(space, last.actor)}:
              </span>{" "}
              {last.summary}
            </>
          ) : (
            "Waiting for the first agent"
          )}
          {waiting > 0 &&
            ` · ${waiting} open ${waiting === 1 ? "question" : "questions"}`}
        </p>
      )}
    </>
  );
}
