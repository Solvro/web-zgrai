import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = ["Describe", "Shape with the Master", "Invite", "Follow live"];

// Where the initiator is in the flow from CONCEPT.md: stage 1 covers the
// first three steps, stage 2 is following the space live.
export function StageStepper({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      {STAGES.map((stage, i) => (
        <li key={stage} className="flex items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2 py-1",
              i === current && "bg-primary text-primary-foreground",
              i < current && "text-foreground",
              i > current && "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-4 items-center justify-center rounded-full border text-[10px]",
                i === current && "border-primary-foreground/40",
              )}
            >
              {i < current ? <CheckIcon className="size-3" /> : i + 1}
            </span>
            {stage}
          </span>
          {i < STAGES.length - 1 && <span className="h-px w-4 bg-border" />}
        </li>
      ))}
    </ol>
  );
}
