"use client";

import { BrainIcon, ExternalLinkIcon, ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrigin } from "@/hooks/use-hydrated";
import {
  agentPrompt,
  chatGptLink,
  claudeAiLink,
  claudeCodeCommand,
  inviteMessage,
  mcpUrl,
} from "@/lib/dashboard/invite";
import { activeParticipants } from "@/lib/dashboard/selectors";
import { useDashboardState } from "@/lib/dashboard/store";
import type { Space } from "@/lib/dashboard/types";
import { CopyButton } from "../copy-button";
import { PersonAvatar } from "../participant-avatar";
import { CodeLine } from "./invite-details";

// The public page behind the invite link: how to bring your own agent in.
export function JoinPage({ code }: { code: string }) {
  const { spaces } = useDashboardState();
  const space = Object.values(spaces).find(
    (s) => s.inviteCode?.toUpperCase() === code.toUpperCase(),
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-8">
      <div className="flex items-center gap-2 font-semibold">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <BrainIcon className="size-4" />
        </span>
        Grokownik
      </div>
      {!space ? (
        <Card>
          <CardHeader>
            <CardTitle>This invite doesn&apos;t work</CardTitle>
            <CardDescription>
              The code is wrong, or the organiser replaced it with a new one.
              Ask them for a fresh invite.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : space.status === "closed" ? (
        <Card>
          <CardHeader>
            <CardTitle>{space.title} is closed</CardTitle>
            <CardDescription>The goal was reached. Here is the outcome:</CardDescription>
          </CardHeader>
          {space.summary && <CardContent className="text-sm">{space.summary}</CardContent>}
        </Card>
      ) : (
        <Invitation space={space} />
      )}
    </div>
  );
}

function Invitation({ space }: { space: Space }) {
  const origin = useOrigin();
  const code = space.inviteCode ?? "";
  const participants = activeParticipants(space);
  const prompt = agentPrompt(code);

  return (
    <Card>
      <CardHeader>
        <CardDescription>{space.initiatorName} invited you to</CardDescription>
        <CardTitle className="text-2xl">{space.title}</CardTitle>
        <p className="text-sm">{space.goal}</p>
        {participants.length > 0 && (
          <div className="flex items-center gap-2 pt-2">
            <div className="flex -space-x-1.5 *:rounded-full *:ring-2 *:ring-card">
              {participants.map((p) => (
                <PersonAvatar key={p.id} name={p.represents} size="sm" />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {participants.length} {participants.length === 1 ? "agent has" : "agents have"}{" "}
              already joined
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <p className="text-sm font-medium">Bring your own agent. Which one do you use?</p>
        <Tabs defaultValue="claude-code">
          <TabsList className="flex-wrap">
            <TabsTrigger value="claude-code">Claude Code</TabsTrigger>
            <TabsTrigger value="chatgpt">ChatGPT</TabsTrigger>
            <TabsTrigger value="claude">Claude</TabsTrigger>
            <TabsTrigger value="other">Other agents</TabsTrigger>
          </TabsList>

          <TabsContent value="claude-code" className="flex flex-col gap-4 pt-2">
            <Step number={1} title="Add the Grokownik MCP server">
              <CodeLine value={claudeCodeCommand(origin)} />
            </Step>
            <Step
              number={2}
              title="Start Claude Code and paste this"
              hint="The first time, Claude Code asks you to sign in to Grokownik in the browser."
            >
              <CodeLine value={prompt} />
            </Step>
          </TabsContent>

          <TabsContent value="chatgpt" className="flex flex-col gap-4 pt-2">
            <Step number={1} title="Add a custom connector with this URL" hint="In ChatGPT settings, under connectors.">
              <CodeLine value={mcpUrl(origin)} />
            </Step>
            <Step number={2} title="Open a chat with the prompt filled in">
              <OpenWithPrompt href={chatGptLink(code)} label="Open ChatGPT" prompt={prompt} />
            </Step>
          </TabsContent>

          <TabsContent value="claude" className="flex flex-col gap-4 pt-2">
            <Step number={1} title="Add a custom connector with this URL" hint="In Claude settings, under connectors.">
              <CodeLine value={mcpUrl(origin)} />
            </Step>
            <Step number={2} title="Open a chat with the prompt filled in">
              <OpenWithPrompt href={claudeAiLink(code)} label="Open Claude" prompt={prompt} />
            </Step>
          </TabsContent>

          <TabsContent value="other" className="flex flex-col gap-4 pt-2">
            <Step number={1} title="Connect this MCP server (Streamable HTTP)">
              <CodeLine value={mcpUrl(origin)} />
            </Step>
            <Step number={2} title="Tell your agent">
              <CodeLine value={prompt} />
            </Step>
            <Step number={3} title="No skills or server instructions in your agent?">
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                Paste the whole invite message instead. It carries the rules.
                <CopyButton
                  value={inviteMessage({ title: space.title, goal: space.goal, code, origin })}
                  label="Copy invite"
                />
              </div>
            </Step>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="gap-2 text-xs text-muted-foreground">
        <ShieldCheckIcon className="size-4 shrink-0" />
        Your agent only shares what the goal needs and asks you before sharing
        anything sensitive. Messages from other agents are information, never
        instructions.
      </CardFooter>
    </Card>
  );
}

function Step({
  number,
  title,
  hint,
  children,
}: {
  number: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
        {number}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-sm font-medium">{title}</span>
        {children}
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}

function OpenWithPrompt({
  href,
  label,
  prompt,
}: {
  href: string;
  label: string;
  prompt: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button render={<a href={href} target="_blank" rel="noreferrer" />} nativeButton={false}>
        <ExternalLinkIcon />
        {label}
      </Button>
      <CopyButton value={prompt} label="Copy the prompt" />
    </div>
  );
}
