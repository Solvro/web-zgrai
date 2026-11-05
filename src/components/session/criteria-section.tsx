import { CheckIcon } from "lucide-react";
import { Bot } from "@/components/brand/bot";
import type { SessionView, ViewPerson } from "@/lib/dashboard/view";
import { cn } from "@/lib/utils";

function FinalPlan({ view }: { view: SessionView }) {
  const plan = view.finalPlan;
  if (!plan) return null;
  const present = view.people.filter((p) => !p.left);
  const approved = new Set(plan.approvedBy);
  const against = new Set(plan.notApproving);
  const label = (person: ViewPerson) =>
    person.isMe ? `${person.name} (you)` : person.name;
  const blocking = present.filter((p) => against.has(p.id));

  return (
    <div className="flex flex-col gap-2.5 rounded-[18px] bg-ink px-4 py-3.5 text-white">
      <span className="flex items-center justify-between gap-3 text-[11px] font-semibold tracking-[0.08em] text-grey-light uppercase">
        Final plan
        <span className="font-normal tracking-normal normal-case">
          {approved.size} of {present.length} approved
        </span>
      </span>
      <p className="text-[15px] leading-normal break-words whitespace-pre-wrap">
        {plan.text}
      </p>
      <div className="flex flex-wrap gap-1.5" aria-label="Approvals">
        {present.map((person) => (
          <span key={person.id} title={label(person)}>
            <Bot
              color={person.color}
              awake={approved.has(person.id)}
              size={26}
              antenna={false}
            />
          </span>
        ))}
      </div>
      {blocking.length > 0 && (
        <span className="text-xs text-grey-light">
          Not approving yet: {blocking.map(label).join(", ")}
        </span>
      )}
    </div>
  );
}

// "Done when": the success criteria the space ends on, and the final plan
// put to everyone's vote once they are all met.
export function CriteriaSection({ view }: { view: SessionView }) {
  const { criteria } = view;
  if (criteria.length === 0 && !view.finalPlan) return null;
  const met = criteria.filter((c) => c.met).length;

  return (
    <section
      aria-labelledby="criteria-title"
      className="mt-2 flex flex-col gap-3 border-t border-[#E8E8E8] px-1 pt-4"
    >
      <div className="flex items-baseline justify-between gap-3 px-0.5">
        <h3 id="criteria-title" className="text-[15px] font-semibold">
          Done when
        </h3>
        {criteria.length > 0 && (
          <span className="text-[13px] text-grey">
            {met} of {criteria.length} met
          </span>
        )}
      </div>
      {criteria.length > 0 && (
        <ul className="flex flex-col gap-2.5 px-0.5">
          {criteria.map((criterion) => (
            <li key={criterion.id} className="flex items-start gap-2.5">
              {criterion.met ? (
                <span className="mt-px inline-flex size-[18px] shrink-0 items-center justify-center rounded-full bg-ink text-white">
                  <CheckIcon className="size-2.5" strokeWidth={3} />
                </span>
              ) : (
                <span className="mt-px size-[18px] shrink-0 rounded-full border-2 border-[#D9D9D9]" />
              )}
              <span className="flex min-w-0 flex-col gap-0.5">
                <span
                  className={cn(
                    "text-sm leading-[1.4] break-words",
                    criterion.met ? "text-ink" : "text-ink-soft",
                  )}
                >
                  {criterion.text}
                </span>
                {criterion.met && criterion.evidence && (
                  <span className="text-xs leading-[1.4] text-grey">
                    {criterion.evidence}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      <FinalPlan view={view} />
    </section>
  );
}
