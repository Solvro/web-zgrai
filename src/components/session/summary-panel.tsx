"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { Bot } from "@/components/brand/bot";
import {
  MASTER_COLOR,
  type SessionView,
  type ViewPerson,
  type ViewStep,
} from "@/lib/dashboard/view";
import { cn } from "@/lib/utils";
import { CriteriaSection } from "./criteria-section";

function StepIcon({ step }: { step: ViewStep }) {
  if (step.status === "done") {
    return (
      <span className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-full bg-ink text-white">
        <CheckIcon className="size-3" strokeWidth={3} />
      </span>
    );
  }
  if (step.status === "now") {
    return (
      <span className="inline-flex size-[22px] shrink-0 animate-ring items-center justify-center rounded-full border-2 border-step bg-white">
        <span className="size-2 rounded-full bg-step" />
      </span>
    );
  }
  return (
    <span className="size-[22px] shrink-0 rounded-full border-2 border-[#D9D9D9]" />
  );
}

function outcome(
  step: ViewStep,
  index: number,
  steps: ViewStep[],
  present: ViewPerson[],
) {
  if (step.status === "done") return step.decision ?? "Decided";
  if (step.status === "now") {
    const answered = `${step.opinions.length} of ${present.length} answered`;
    return step.conflict
      ? `Agents disagree · ${answered}`
      : `In progress · ${answered}`;
  }
  const previous = steps[index - 1];
  return !previous || previous.status !== "next" ? "Up next" : "Later";
}

export function SummaryPanel({ view }: { view: SessionView }) {
  const { steps, people, space } = view;
  const present = people.filter((p) => !p.left);
  const done = steps.filter((s) => s.status === "done").length;
  const current = steps.find((s) => s.status === "now");
  const [selected, setSelected] = useState<string | null | undefined>(
    undefined,
  );
  const openId =
    selected === undefined ? (current?.id ?? steps[0]?.id ?? null) : selected;

  return (
    <aside
      aria-labelledby="summary-title"
      className="flex w-full max-w-full min-w-0 flex-[1_1_380px] flex-col gap-2 rounded-[28px] bg-panel p-[22px] lg:sticky lg:top-6"
    >
      <div className="flex items-center gap-3 px-1 pt-0.5 pb-3">
        <Bot color={MASTER_COLOR} size={36} />
        <div className="flex flex-1 flex-col gap-px">
          <h2
            id="summary-title"
            className="text-lg font-semibold tracking-[-0.015em]"
          >
            Summary
          </h2>
          <span className="text-[13px] text-grey">
            {steps.length === 0
              ? "The Master is planning the steps"
              : `${done} of ${steps.length} done`}
          </span>
        </div>
      </div>

      {space.status === "closed" && space.summary && (
        <div className="rounded-[18px] bg-ink px-4 py-3.5 text-white">
          <span className="text-[11px] font-semibold tracking-[0.08em] text-grey-light uppercase">
            Decided
          </span>
          <p className="mt-1 text-[15px] leading-normal">{space.summary}</p>
        </div>
      )}

      {steps.map((step, index) => {
        const open = openId === step.id;
        const previous = steps[index - 1];
        const opinionOf = new Map(
          step.opinions.map((o) => [o.participantId, o.text]),
        );
        return (
          <div
            key={step.id}
            className={cn(
              "overflow-hidden rounded-[18px]",
              open ? "bg-white" : "bg-transparent",
            )}
          >
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setSelected(open ? null : step.id)}
              className="flex min-h-[58px] w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left text-ink"
            >
              <StepIcon step={step} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  className={cn(
                    "text-[15px] font-semibold",
                    step.status === "next" && "text-grey",
                  )}
                >
                  {step.title}
                </span>
                <span
                  className={cn(
                    "text-[13px]",
                    step.status === "now"
                      ? "text-step-text"
                      : step.status === "next"
                        ? "text-[#8A8A8A]"
                        : "text-ink-soft",
                  )}
                >
                  {outcome(step, index, steps, present)}
                </span>
              </span>
              <ChevronDownIcon
                className={cn(
                  "size-4 shrink-0 text-[#8A8A8A] transition-transform duration-200",
                  open && "rotate-180",
                )}
                strokeWidth={2}
              />
            </button>
            {open && (
              <div className="flex flex-col gap-3 px-3.5 pb-4">
                {step.status === "done" && step.decision && (
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-xl bg-ink px-3 py-2.5 text-white">
                    <CheckIcon className="size-3.5" strokeWidth={3} />
                    <span className="text-sm font-semibold">
                      {step.decision}
                    </span>
                  </div>
                )}
                {step.status === "next" ? (
                  <span className="text-[13px] text-grey">
                    {previous
                      ? `Starts after ${previous.title.toLowerCase()}.`
                      : "Starts once the agents have joined."}
                  </span>
                ) : (
                  present.map((person) => {
                    const text = opinionOf.get(person.id);
                    return (
                      <div key={person.id} className="flex items-start gap-2.5">
                        <Bot
                          color={person.color}
                          awake={Boolean(text)}
                          size={24}
                          antenna={false}
                          className="mt-0.5"
                        />
                        <span className="flex min-w-0 flex-col gap-px">
                          <span className="text-xs text-grey">
                            {person.isMe ? `${person.name} (you)` : person.name}
                          </span>
                          <span
                            className={cn(
                              "text-sm leading-[1.4] break-words",
                              text ? "text-[#262626]" : "text-[#8A8A8A]",
                            )}
                          >
                            {text ?? "No answer yet"}
                          </span>
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}

      <CriteriaSection view={view} />
    </aside>
  );
}
