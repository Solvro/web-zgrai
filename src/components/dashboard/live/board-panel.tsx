"use client";

import {
  CircleCheckIcon,
  CircleDashedIcon,
  CircleDotIcon,
  FlagIcon,
  NotebookPenIcon,
  PinIcon,
  TriangleAlertIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { timeAgo } from "@/lib/dashboard/format";
import { progress } from "@/lib/dashboard/selectors";
import type { BoardItem, Space, SubproblemStatus } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

const FRESH_MS = 4000;

// The Master's thinking in forms other than the chat: pins, progress, notes.
export function BoardPanel({
  space,
  now,
  className,
}: {
  space: Space;
  now: number;
  className?: string;
}) {
  const pins = space.board.filter((item) => item.kind === "pin");
  const notes = space.board.filter((item) => item.kind === "note");

  return (
    <aside
      className={cn(
        "flex min-h-0 flex-col gap-4 overflow-y-auto *:shrink-0",
        className,
      )}
    >
      {space.status === "closed" && (
        <Card className="bg-emerald-50 ring-emerald-300 dark:bg-emerald-950/40 dark:ring-emerald-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlagIcon className="size-4" />
              Outcome
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {space.summary || "Closed without a summary."}
          </CardContent>
        </Card>
      )}

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PinIcon className="size-4" />
            Pins
          </CardTitle>
          <CardDescription>
            Decisions and key facts, pinned by the Master.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {pins.length === 0 && (
            <p className="text-xs text-muted-foreground">Nothing pinned yet.</p>
          )}
          {pins.map((pin) => (
            <div
              key={pin.id}
              className={cn(
                "rounded-lg border p-2.5 transition-colors duration-1000",
                isFresh(pin, now) &&
                  "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40",
              )}
            >
              <div className="text-xs text-muted-foreground">{pin.title}</div>
              <div className="text-sm font-medium">{pin.content}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <ProgressCard space={space} />

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <NotebookPenIcon className="size-4" />
            Master&apos;s notes
          </CardTitle>
          <CardDescription>
            What the Master keeps in mind right now.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {notes.length === 0 && (
            <p className="text-xs text-muted-foreground">
              The Master starts taking notes once agents answer.
            </p>
          )}
          {notes.map((note) => (
            <div
              key={note.id}
              className={cn(
                "-mx-1.5 rounded-lg px-1.5 py-1 transition-colors duration-1000",
                isFresh(note, now) && "bg-amber-50 dark:bg-amber-950/30",
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium">{note.title}</span>
                <span className="text-[11px] text-muted-foreground">
                  {timeAgo(note.updatedAt, now)}
                </span>
              </div>
              <NoteContent content={note.content} />
            </div>
          ))}
        </CardContent>
      </Card>
    </aside>
  );
}

function isFresh(item: BoardItem, now: number) {
  return now - item.updatedAt < FRESH_MS;
}

function NoteContent({ content }: { content: string }) {
  const lines = content.split("\n").filter(Boolean);
  return (
    <ul className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
      {lines.map((line) => (
        <li key={line} className="flex gap-1.5">
          <span>•</span>
          <span>{line.replace(/^- /, "")}</span>
        </li>
      ))}
    </ul>
  );
}

const STATUS: Record<
  SubproblemStatus,
  { label: string; icon: React.ReactNode; className: string }
> = {
  open: {
    label: "Not started",
    icon: <CircleDashedIcon className="size-4 text-muted-foreground" />,
    className: "text-muted-foreground",
  },
  discussing: {
    label: "Discussing",
    icon: <CircleDotIcon className="size-4 animate-pulse text-sky-600" />,
    className: "text-sky-700 dark:text-sky-300",
  },
  conflict: {
    label: "Conflict",
    icon: <TriangleAlertIcon className="size-4 text-amber-600" />,
    className: "text-amber-700 dark:text-amber-300",
  },
  decided: {
    label: "Decided",
    icon: <CircleCheckIcon className="size-4 text-emerald-600" />,
    className: "text-emerald-700 dark:text-emerald-300",
  },
};

function ProgressCard({ space }: { space: Space }) {
  const { decided, total, percent } = progress(space);
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Progress</CardTitle>
        <CardDescription>
          {decided} of {total} subproblems decided
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Progress value={percent} />
        <ul className="flex flex-col gap-2.5">
          {space.subproblems.map((sub) => {
            const status = STATUS[sub.status];
            return (
              <li key={sub.id} className="flex gap-2">
                <span className="mt-0.5">{status.icon}</span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm">{sub.title}</span>
                    <span className={cn("text-xs", status.className)}>
                      {status.label}
                    </span>
                  </div>
                  {sub.decision && (
                    <span className="text-xs text-muted-foreground">
                      {sub.decision}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {space.constraints.length > 0 && (
          <div className="flex flex-col gap-1 border-t pt-3">
            <span className="text-xs font-medium">Constraints</span>
            <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
              {space.constraints.map((constraint) => (
                <li key={constraint}>• {constraint}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
