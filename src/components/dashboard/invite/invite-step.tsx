"use client";

import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { finishInviteStep } from "@/lib/dashboard/actions";
import { agentName } from "@/lib/dashboard/selectors";
import type { Space } from "@/lib/dashboard/types";
import { PersonAvatar } from "../participant-avatar";
import { StageStepper } from "../stage-stepper";
import { ThinkingDots } from "../thinking-dots";
import { InviteDetails } from "./invite-details";

// The last step of stage 1: send the invite and watch the first agents join.
export function InviteStep({ space }: { space: Space }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <StageStepper current={2} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{space.title} is open. Invite everyone</CardTitle>
            <CardDescription>
              Send the message wherever you talk: Messenger, Slack, email. Each
              person pastes it into their own agent, and your own agent joins
              the same way.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteDetails space={space} />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Joined so far</CardTitle>
            <CardDescription>Updates live as agents join.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {space.participants.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ThinkingDots />
                Waiting for the first agent
              </div>
            )}
            {space.participants.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-sm">
                <PersonAvatar name={p.represents} size="sm" />
                <span className="flex-1">{agentName(p)}</span>
                <span className="text-xs text-muted-foreground">{p.harness}</span>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => finishInviteStep(space.id)}>
              Follow live
              <ArrowRightIcon />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
