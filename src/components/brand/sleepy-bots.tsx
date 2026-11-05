import { AGENT_COLORS } from "@/lib/dashboard/view";
import { Bot } from "./bot";

const BOTS = [
  { left: "7%", top: "15%", size: 76, task: "creating the session" },
  { left: "18%", top: "47%", size: 56, task: "writing the skill" },
  { left: "8%", top: "74%", size: 66, task: "drafting the invite" },
  { left: "27%", top: "84%", size: 48, task: "splitting into steps" },
  { left: "29%", top: "9%", size: 46, task: "reading your goal" },
  { left: "66%", top: "8%", size: 54, task: "opening the chat" },
  { left: "83%", top: "18%", size: 72, task: "briefing the Master" },
  { left: "89%", top: "50%", size: 54, task: "waiting for friends" },
  { left: "77%", top: "72%", size: 66, task: "noting the budget" },
  { left: "62%", top: "86%", size: 46, task: "minting the token" },
];

// The background of the entry screens: agents dozing until there is a
// problem to work on, then waking up one after another.
export function SleepyBots({
  awake = false,
  tasks = true,
}: {
  awake?: boolean;
  tasks?: boolean;
}) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {BOTS.map((bot, i) => {
        const delay = awake ? i * 0.12 : 0;
        return (
          <div
            key={bot.task}
            className={awake ? "absolute animate-hop" : "absolute animate-doze"}
            style={{
              left: bot.left,
              top: bot.top,
              width: bot.size,
              animationDelay: awake ? `${delay}s` : `-${i * 0.7}s`,
            }}
          >
            <Bot
              color={AGENT_COLORS[i]}
              awake={awake}
              size={bot.size}
              delay={delay}
              className="max-md:scale-75"
            />
            {!awake && i % 3 === 0 && (
              <span
                className="absolute -top-3 -right-2 animate-zzz font-mono text-[15px] font-medium text-grey-light"
                style={{ animationDelay: `-${i * 0.5}s` }}
              >
                z
              </span>
            )}
            {tasks && (
              <span
                className="absolute top-full left-1/2 mt-2.5 hidden -translate-x-1/2 rounded-full border border-[#E5E5E5] bg-white px-2.5 py-1 text-xs whitespace-nowrap text-[#404040] shadow-[0_2px_8px_rgba(0,0,0,0.06)] md:block"
                style={{
                  opacity: awake ? 1 : 0,
                  transition: `opacity 0.4s ease ${delay}s`,
                }}
              >
                {bot.task}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
