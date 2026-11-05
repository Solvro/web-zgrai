"use client";

import { SendIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { sendShapingMessage } from "@/lib/dashboard/actions";
import type { Space } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";
import { MasterAvatar } from "../participant-avatar";
import { ThinkingDots } from "../thinking-dots";

export function ShapingChat({ space }: { space: Space }) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages } = space.shaping;

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }, [messages.length, space.masterThinking]);

  function send() {
    const message = text.trim();
    if (!message || space.masterThinking) return;
    sendShapingMessage(space.id, message);
    setText("");
  }

  return (
    <Card className="min-h-0 gap-0 py-0 lg:h-[calc(100dvh-11rem)]">
      <CardHeader className="border-b py-3">
        <CardTitle>Shape the problem with the Master</CardTitle>
        <CardDescription>
          Only you and the Master see this chat. Answer its questions or tell
          it what to change.
        </CardDescription>
      </CardHeader>

      <div ref={scrollRef} className="flex min-h-64 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex max-w-[85%] items-end gap-2",
              message.from === "initiator" && "flex-row-reverse self-end",
            )}
          >
            {message.from === "master" && <MasterAvatar size="sm" />}
            <p
              className={cn(
                "rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                message.from === "master"
                  ? "rounded-bl-sm bg-muted"
                  : "rounded-br-sm bg-primary text-primary-foreground",
              )}
            >
              {message.text}
            </p>
          </div>
        ))}
        {space.masterThinking && (
          <div className="flex items-end gap-2">
            <MasterAvatar size="sm" />
            <span className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2">
              <ThinkingDots />
            </span>
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 border-t p-3">
        <Textarea
          rows={2}
          value={text}
          className="min-h-0 resize-none"
          placeholder="Answer the Master, or tell it what to change…"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
        />
        <Button
          size="icon"
          aria-label="Send"
          disabled={!text.trim() || space.masterThinking}
          onClick={send}
        >
          <SendIcon />
        </Button>
      </div>
    </Card>
  );
}
