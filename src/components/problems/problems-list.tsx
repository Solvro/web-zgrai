import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { Bot } from "@/components/brand/bot";
import type { ProblemSummary } from "@/lib/dashboard/view";
import { cn } from "@/lib/utils";

const MAX_BOTS = 5;

function lowerFirst(text: string) {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function decidedWhen(iso: string) {
  const days = Math.floor(
    (new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) /
      86_400_000,
  );
  if (days <= 0) return "Decided today";
  if (days === 1) return "Decided yesterday";
  return `Decided on ${new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" })}`;
}

function meta(problem: ProblemSummary): { text: string; active: boolean } {
  if (problem.status === "closed")
    return {
      text: problem.closedAt ? decidedWhen(problem.closedAt) : "Decided",
      active: false,
    };
  if (problem.status === "draft") return { text: "Draft", active: false };
  if (problem.currentStep)
    return {
      text: `Now deciding ${lowerFirst(problem.currentStep)}`,
      active: true,
    };
  if (problem.agentsJoined === 0)
    return { text: "Waiting for agents to join", active: false };
  if (problem.stepsTotal === 0)
    return { text: "The Master is planning the steps", active: false };
  if (problem.nextStep)
    return { text: `Next up: ${lowerFirst(problem.nextStep)}`, active: false };
  return { text: "Wrapping up", active: false };
}

function progressLabel(problem: ProblemSummary) {
  if (problem.stepsTotal === 0) return "No steps yet";
  if (problem.stepsDone === problem.stepsTotal)
    return `All ${problem.stepsTotal} steps done`;
  if (problem.stepsDone === 0 && !problem.currentStep) return "Not started";
  return `${problem.stepsDone} of ${problem.stepsTotal} steps done`;
}

export function ProblemsList({ problems }: { problems: ProblemSummary[] }) {
  if (problems.length === 0) {
    return (
      <p className="border-t border-line py-10 text-center text-[15px] text-grey">
        No problems yet. Describe one above and wake the agents.
      </p>
    );
  }
  return (
    <section aria-label="Problems" className="flex flex-col">
      {problems.map((problem) => {
        const { text, active } = meta(problem);
        const extra = problem.bots.length - MAX_BOTS;
        return (
          <Link
            key={problem.id}
            href={`/spaces/${problem.id}`}
            className="flex flex-wrap items-center gap-x-[22px] gap-y-3.5 border-b border-line px-1 py-5 text-ink transition-colors hover:bg-[#FAFAFA]"
          >
            <span className="flex w-24 shrink-0 items-center">
              {problem.bots.slice(0, MAX_BOTS).map((bot, i) => (
                <Bot
                  key={i}
                  color={bot.color}
                  awake={bot.awake}
                  size={32}
                  antenna={false}
                  outline="#FFFFFF"
                  className="-mr-[9px]"
                />
              ))}
              {extra > 0 && (
                <span className="ml-3 text-xs text-grey">+{extra}</span>
              )}
            </span>
            <span className="flex min-w-0 flex-[1_1_260px] flex-col gap-[3px]">
              <span className="text-lg font-semibold tracking-[-0.015em]">
                {problem.title}
              </span>
              <span
                className={cn(
                  "text-sm",
                  active ? "text-step-text" : "text-grey",
                )}
              >
                {text}
              </span>
            </span>
            {problem.stepsTotal > 0 && (
              <span
                aria-label={progressLabel(problem)}
                className="grid shrink-0 gap-1"
                style={{
                  gridTemplateColumns: `repeat(${problem.stepsTotal}, 18px)`,
                }}
              >
                {Array.from({ length: problem.stepsTotal }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-[5px] rounded-full",
                      i < problem.stepsDone
                        ? "bg-ink"
                        : i === problem.stepsDone && problem.currentStep
                          ? "bg-step"
                          : "bg-[#E5E5E5]",
                    )}
                  />
                ))}
              </span>
            )}
            <span className="min-w-[92px] shrink-0 text-right text-[13px] text-grey">
              {problem.role === "initiator"
                ? "Admin"
                : `Invited by ${problem.initiatorName}`}
            </span>
            <ChevronRightIcon
              className="size-4 shrink-0 text-grey-light"
              strokeWidth={2}
            />
          </Link>
        );
      })}
    </section>
  );
}
