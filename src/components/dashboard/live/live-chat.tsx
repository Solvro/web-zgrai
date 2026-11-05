"use client";

import { ArrowDownIcon, FilterIcon } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { agentName } from "@/lib/dashboard/selectors";
import type { Activity, Space } from "@/lib/dashboard/types";
import { MasterAvatar } from "../participant-avatar";
import { ThinkingDots } from "../thinking-dots";
import { ChatBubble, isSystemLine } from "./chat-bubble";

// How close to the bottom still counts as "following" the chat.
const STICKY_PX = 80;

function matchesFilter(activity: Activity, filter: string) {
  if (filter === "all") return true;
  if (filter === "master") return activity.actor.kind === "master";
  return (
    (activity.actor.kind === "participant" &&
      activity.actor.participantId === filter) ||
    (activity.type === "question" &&
      (activity.addressedTo?.includes(filter) ?? true))
  );
}

// The group chat: every agent -> MCP -> Master interaction as one bubble.
export function LiveChat({
  space,
  viewerId,
  now,
}: {
  space: Space;
  viewerId?: string;
  now: number;
}) {
  const [filter, setFilter] = useState("all");
  const [showSystem, setShowSystem] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const [unseen, setUnseen] = useState(0);
  const seenCount = useRef(0);

  const visible = space.activities.filter(
    (a) => matchesFilter(a, filter) && (showSystem || !isSystemLine(a)),
  );

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    const element = scrollRef.current;
    if (element) element.scrollTo({ top: element.scrollHeight, behavior });
  }

  // Start at the newest bubble.
  useLayoutEffect(() => {
    scrollToBottom("instant");
  }, []);

  // Follow new bubbles only while the viewer is at the bottom, like any chat.
  useEffect(() => {
    const added = visible.length - seenCount.current;
    seenCount.current = visible.length;
    if (following.current) scrollToBottom();
    else if (added > 0) setUnseen((count) => count + added);
  }, [visible.length, space.masterThinking]);

  function onScroll() {
    const element = scrollRef.current;
    if (!element) return;
    following.current =
      element.scrollHeight - element.scrollTop - element.clientHeight <
      STICKY_PX;
    if (following.current) setUnseen(0);
  }

  const filterLabel =
    filter === "all"
      ? "Everyone"
      : filter === "master"
        ? "Master only"
        : (space.participants.find((p) => p.id === filter)?.represents ??
          "Everyone");

  return (
    <section className="relative flex h-[75dvh] flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 lg:h-auto lg:min-h-0 lg:flex-1">
      <header className="flex items-center gap-2 border-b px-4 py-2.5">
        <h2 className="font-medium">Live chat</h2>
        {space.status === "open" && (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            live
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {space.activities.length} interactions
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="sm" className="ml-auto" />}
          >
            <FilterIcon />
            {filterLabel}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Show bubbles from</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={filter}
                onValueChange={(value) => setFilter(value)}
              >
                <DropdownMenuRadioItem value="all">
                  Everyone
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="master">
                  Master only
                </DropdownMenuRadioItem>
                {space.participants.map((p) => (
                  <DropdownMenuRadioItem key={p.id} value={p.id}>
                    {agentName(p)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={showSystem}
              onCheckedChange={setShowSystem}
            >
              Joins and system events
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex flex-1 flex-col gap-3 overflow-y-auto p-4"
      >
        {visible.length === 0 && (
          <p className="m-auto max-w-xs text-center text-sm text-muted-foreground">
            {space.activities.length === 0
              ? "Nothing yet. Bubbles show up here as soon as the first agent joins."
              : "No bubbles match this filter."}
          </p>
        )}
        {visible.map((activity) => (
          <ChatBubble
            key={activity.id}
            activity={activity}
            space={space}
            viewerId={viewerId}
            now={now}
          />
        ))}
        {space.masterThinking && (
          <div className="flex items-center gap-2">
            <MasterAvatar size="sm" />
            <span className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-primary/[0.06] px-3 py-2 text-xs text-muted-foreground ring-1 ring-primary/15">
              The Master is thinking
              <ThinkingDots />
            </span>
          </div>
        )}
      </div>

      {unseen > 0 && (
        <Button
          size="sm"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 shadow-md"
          onClick={() => {
            scrollToBottom();
            setUnseen(0);
          }}
        >
          <ArrowDownIcon />
          {unseen} new
        </Button>
      )}
    </section>
  );
}
