import { CheckIcon, LockIcon } from "lucide-react";
import { Bot } from "@/components/brand/bot";
import {
  MASTER_COLOR,
  type ViewMessage,
  type ViewPerson,
  type ViewStep,
} from "@/lib/dashboard/view";
import { cn } from "@/lib/utils";

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Time({ iso, className }: { iso: string; className?: string }) {
  return (
    <time
      dateTime={iso}
      className={cn("font-mono text-xs font-normal tracking-normal", className)}
    >
      {clock(iso)}
    </time>
  );
}

const KIND_LABEL: Partial<Record<ViewMessage["kind"], string>> = {
  question: "Question",
  proposal: "Proposal",
};

function MasterBubble({
  message,
  step,
  side,
}: {
  message: ViewMessage;
  step?: ViewStep;
  side: "left" | "right";
}) {
  const labels = [
    "Master",
    step?.title,
    KIND_LABEL[message.kind],
    message.private ? "only you" : undefined,
  ].filter(Boolean);
  return (
    <div
      className={cn(
        "flex items-end gap-3",
        side === "right" && "flex-row-reverse",
      )}
    >
      <Bot color={MASTER_COLOR} size={34} />
      <div
        className={cn(
          "flex max-w-[520px] min-w-0 flex-col gap-1.5 bg-ink px-[18px] pt-3.5 pb-4 text-white",
          side === "right"
            ? "rounded-[22px_22px_6px_22px]"
            : "rounded-[22px_22px_22px_6px]",
        )}
      >
        <span className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-grey-light uppercase">
          {labels.map((label, i) => (
            <span key={label} className="flex items-center gap-2">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className="size-[3px] rounded-full bg-[#525252]"
                />
              )}
              {label}
            </span>
          ))}
          <Time
            iso={message.createdAt}
            className="ml-auto pl-5 text-[#8A8A8A]"
          />
        </span>
        <span className="text-base leading-normal break-words whitespace-pre-wrap">
          {message.text}
        </span>
        {message.tally && (
          <span className="text-xs text-grey-light">
            {message.tally.yes} yes · {message.tally.no} no
            {message.tally.abstain > 0 && ` · ${message.tally.abstain} abstain`}
          </span>
        )}
      </div>
    </div>
  );
}

function AgentMessage({
  message,
  author,
  mine,
}: {
  message: ViewMessage;
  author?: ViewPerson;
  mine: "left" | "right" | false;
}) {
  const color = author?.color ?? "#A3A3A3";
  const name = author?.name ?? "Someone";
  const label = mine ? "Your agent" : `${name}'s agent`;
  const note = message.private ? (
    <span className="inline-flex items-center gap-1 text-xs text-grey">
      <LockIcon className="size-3" />
      Private note to the Master
    </span>
  ) : null;

  if (mine === "right") {
    return (
      <div className="flex items-end justify-end gap-3">
        <div className="flex max-w-[520px] min-w-0 flex-col items-end gap-1.5">
          <span className="text-xs text-[#8A8A8A]">
            <Time iso={message.createdAt} /> ·{" "}
            <span className="font-semibold text-ink">{label}</span>
          </span>
          {note}
          <div
            className="rounded-[20px_20px_6px_20px] px-4 py-3 text-base leading-normal break-words whitespace-pre-wrap"
            style={{ background: `color-mix(in srgb, ${color} 16%, white)` }}
          >
            {message.text}
          </div>
        </div>
        <Bot color={color} size={34} />
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3.5">
      <Bot color={color} size={34} />
      <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-semibold">{label}</span>
          <Time iso={message.createdAt} className="text-[#8A8A8A]" />
          {note}
        </div>
        <p className="text-base leading-[1.55] break-words whitespace-pre-wrap">
          {message.text}
        </p>
      </div>
    </div>
  );
}

function AdminNote({
  message,
  author,
  mine,
}: {
  message: ViewMessage;
  author?: ViewPerson;
  mine: boolean;
}) {
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "flex max-w-[520px] min-w-0 flex-col gap-1.5",
          mine && "items-end",
        )}
      >
        <span className="text-xs text-[#8A8A8A]">
          <Time iso={message.createdAt} /> ·{" "}
          <span className="font-semibold text-ink">
            {mine ? "You" : `${author?.name ?? "Admin"} (admin)`}
          </span>{" "}
          to the Master
        </span>
        <div
          className={cn(
            "border border-[#E5E5E5] bg-[#FAFAFA] px-4 py-3 text-base leading-normal break-words whitespace-pre-wrap",
            mine
              ? "rounded-[20px_20px_6px_20px]"
              : "rounded-[20px_20px_20px_6px]",
          )}
        >
          {message.text}
        </div>
      </div>
    </div>
  );
}

function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-[13px] text-grey">
      <span className="h-px flex-1 bg-line" />
      <span className="inline-flex max-w-[80%] items-center gap-1.5 text-center">
        {children}
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function Chat({
  messages,
  people,
  steps,
  viewer,
}: {
  messages: ViewMessage[];
  people: ViewPerson[];
  steps: ViewStep[];
  viewer: { participantId: string; role: "initiator" | "member" };
}) {
  const personById = new Map(people.map((p) => [p.id, p]));
  const stepById = new Map(steps.map((s) => [s.id, s]));
  const admin = viewer.role === "initiator";

  if (messages.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-grey">
        Nothing yet. The Master starts as soon as the first agents join.
      </p>
    );
  }

  return (
    <>
      {messages.map((message) => {
        if (message.kind === "decision") {
          return (
            <Divider key={message.id}>
              <CheckIcon className="size-[13px] shrink-0" strokeWidth={2.6} />
              <span>
                <strong className="font-semibold text-ink">
                  {message.text}
                </strong>{" "}
                · <Time iso={message.createdAt} className="text-[13px]" />
              </span>
            </Divider>
          );
        }
        if (message.author.type === "system") {
          return (
            <p
              key={message.id}
              className="text-center text-xs leading-relaxed text-[#8A8A8A]"
            >
              {message.text}
            </p>
          );
        }
        if (message.author.type === "master") {
          return (
            <MasterBubble
              key={message.id}
              message={message}
              step={message.stepId ? stepById.get(message.stepId) : undefined}
              side={admin ? "right" : "left"}
            />
          );
        }
        const author = personById.get(message.author.participantId);
        const isMine = message.author.participantId === viewer.participantId;
        if (message.viaDashboard) {
          return (
            <AdminNote
              key={message.id}
              message={message}
              author={author}
              mine={isMine}
            />
          );
        }
        return (
          <AgentMessage
            key={message.id}
            message={message}
            author={author}
            mine={isMine ? (admin ? "left" : "right") : false}
          />
        );
      })}
    </>
  );
}
