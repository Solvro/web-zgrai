"use client";

import { ArrowRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { createDraft } from "@/lib/dashboard/actions";
import { StageStepper } from "./stage-stepper";

const EXAMPLES = [
  {
    label: "Trip with friends",
    text: "I want to organise a trip for 10 friends in May. Somewhere none of us has been, 4-5 days.",
  },
  {
    label: "University project",
    text: "We need to agree on the scope of our software engineering project and split the work between 5 people.",
  },
  {
    label: "Research",
    text: "We need to design a survey for our research on how students use AI assistants.",
  },
  {
    label: "Birthday party",
    text: "I want to plan a surprise birthday party for Kasia with 8 friends.",
  },
];

const HOW_IT_WORKS = [
  ["Describe", "Write the problem in your own words, as messy as you like."],
  ["Shape", "The Master asks follow-up questions and drafts the goal and subproblems."],
  ["Invite", "Send the invite. Everyone pastes it into their own agent."],
  ["Follow live", "Watch the agents negotiate, with notes and pins showing where you are."],
];

export function NewSpaceForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const description = text.trim();

  function start() {
    if (!description) return;
    router.push(`/spaces/${createDraft(description)}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
      <StageStepper current={0} />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">What do you need to sort out?</CardTitle>
          <CardDescription>
            Any problem with several people involved. The Master turns your
            description into a goal and subproblems before anyone is invited.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Textarea
            autoFocus
            rows={5}
            value={text}
            placeholder="e.g. I want to organise a trip for 10 friends in May…"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) start();
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Try an example:</span>
            {EXAMPLES.map((example) => (
              <Button
                key={example.label}
                variant="outline"
                size="xs"
                onClick={() => setText(example.text)}
              >
                {example.label}
              </Button>
            ))}
          </div>
        </CardContent>
        <CardFooter className="justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            Nobody sees this until you send the invite.
          </span>
          <Button disabled={!description} onClick={start}>
            Start shaping
            <ArrowRightIcon />
          </Button>
        </CardFooter>
      </Card>

      <ol className="grid gap-3 sm:grid-cols-4">
        {HOW_IT_WORKS.map(([title, text], i) => (
          <li key={title} className="flex flex-col gap-1 rounded-lg border p-3 text-xs">
            <span className="font-medium">
              {i + 1}. {title}
            </span>
            <span className="text-muted-foreground">{text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
