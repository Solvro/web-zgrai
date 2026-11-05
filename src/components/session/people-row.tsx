import { Bot } from "@/components/brand/bot";
import type { ViewPerson } from "@/lib/dashboard/view";

function statusLabel(person: ViewPerson) {
  const status =
    person.status === "no-agent"
      ? "no agent yet"
      : person.status === "online"
        ? "online"
        : "dozing";
  return person.role === "initiator" ? `admin · ${status}` : status;
}

export function PeopleRow({ people }: { people: ViewPerson[] }) {
  const present = people.filter((p) => !p.left);
  return (
    <div
      role="list"
      aria-label="People in the session"
      className="flex flex-wrap gap-x-6 gap-y-3.5 border-b border-line pt-1 pb-[22px]"
    >
      {present.map((person) => {
        const awake = person.status === "online";
        return (
          <div
            key={person.id}
            role="listitem"
            className="flex min-w-14 flex-col items-center gap-1.5"
            title={person.harness ? `Agent: ${person.harness}` : undefined}
          >
            <Bot color={person.color} awake={awake} size={44} />
            <span className="flex flex-col items-center gap-px">
              <span
                className={
                  person.status === "no-agent"
                    ? "text-[13px] font-semibold whitespace-nowrap text-grey"
                    : "text-[13px] font-semibold whitespace-nowrap text-ink"
                }
              >
                {person.isMe ? `${person.name} (you)` : person.name}
              </span>
              <span
                className={
                  awake
                    ? "text-[11px] whitespace-nowrap text-grey"
                    : "text-[11px] whitespace-nowrap text-[#8A8A8A]"
                }
              >
                {statusLabel(person)}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
