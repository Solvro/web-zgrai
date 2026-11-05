"use client";

import { ArrowRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { startSpaceAction } from "@/app/actions";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  {
    label: "Trip with friends",
    text: "Plan a May trip for 10 friends: where we go, when, and where we sleep. Max 900 zł each.",
  },
  {
    label: "Uni project",
    text: "Split our uni project between 4 people: pick the topic, who does which part, and the deadlines.",
  },
  {
    label: "Research plan",
    text: "Agree on a research plan for our lab: the question, the method, and who runs which experiment.",
  },
];

// "Wake the agents": opens a session from one description and goes to its
// invite. `onPendingChange` lets the page wake the background bots meanwhile.
export function ProblemForm({
  variant = "hero",
  onPendingChange,
}: {
  variant?: "hero" | "compact";
  onPendingChange?: (pending: boolean) => void;
}) {
  const id = useId();
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const hero = variant === "hero";

  function submit() {
    if (!text.trim() || pending) return;
    onPendingChange?.(true);
    startTransition(async () => {
      const result = await startSpaceAction(text);
      if (!result.ok) {
        onPendingChange?.(false);
        toast.error(result.error);
        return;
      }
      const { spaceId, code } = result.data;
      router.push(`/spaces/${spaceId}/invite?code=${encodeURIComponent(code)}`);
    });
  }

  return (
    <form
      aria-label="New problem"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className={cn(
        "flex w-full flex-col gap-2.5 rounded-[22px] border border-[#E5E5E5] bg-white px-[18px] pt-[18px] pb-3.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_rgba(0,0,0,0.07)]",
      )}
    >
      <label htmlFor={id} className="text-[13px] font-medium text-grey">
        {hero ? "The problem" : "New problem"}
      </label>
      <textarea
        id={id}
        rows={hero ? 3 : 2}
        value={text}
        disabled={pending}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            submit();
          }
        }}
        placeholder={
          hero ? EXAMPLES[0].text : "What does your group need to decide?"
        }
        className="resize-none border-none bg-transparent p-0 text-lg leading-normal text-ink outline-none placeholder:text-grey-light disabled:opacity-60"
      />
      <div
        className={cn(
          "flex flex-wrap items-center gap-2.5 pt-1.5",
          hero ? "justify-between" : "justify-end",
        )}
      >
        {hero && (
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((example) => (
              <button
                key={example.label}
                type="button"
                disabled={pending}
                onClick={() => setText(example.text)}
                className="min-h-9 cursor-pointer rounded-full border border-[#E5E5E5] bg-white px-3 text-[13px] text-[#404040] transition-colors hover:border-[#D4D4D4] hover:bg-[#FAFAFA] disabled:cursor-default disabled:opacity-60"
              >
                {example.label}
              </button>
            ))}
          </div>
        )}
        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="inline-flex min-h-[46px] cursor-pointer items-center gap-2 rounded-[14px] bg-ink px-5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-50"
        >
          {pending ? "Waking the agents" : "Wake the agents"}
          {pending ? (
            <Spinner />
          ) : (
            <ArrowRightIcon className="size-4" strokeWidth={2.2} />
          )}
        </button>
      </div>
    </form>
  );
}
