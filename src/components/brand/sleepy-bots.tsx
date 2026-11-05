"use client";

import { useEffect, useRef, useState } from "react";
import { AGENT_COLORS } from "@/lib/dashboard/view";
import { type JellyHandle, loadJelly } from "./jelly-runtime";

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
// problem to work on, then waking up one after another. With WebGL it is a
// live 3D field of jelly bots that wander, talk in pairs and visit the
// Master, and keeps out of anything marked [data-jelly-clear] on the screen.
export function SleepyBots({
  awake = false,
  tasks = true,
}: {
  awake?: boolean;
  tasks?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<JellyHandle | null>(null);
  const awakeRef = useRef(awake);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadJelly().then((jelly) => {
      const canvas = canvasRef.current;
      if (cancelled || !jelly || !canvas) return;
      // The screen this background belongs to: its [data-jelly-clear]
      // elements are the areas the bots stay out of.
      const screen = canvas.parentElement?.parentElement ?? null;
      handleRef.current = jelly.mountOverlay(canvas, screen, {
        field: {
          bots: AGENT_COLORS.map((color) => ({ color, shape: "auto" })),
          master: true,
          state: awakeRef.current ? "awake" : "asleep",
        },
      });
      setLive(true);
    });
    return () => {
      cancelled = true;
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (awakeRef.current === awake) return;
    awakeRef.current = awake;
    if (awake) handleRef.current?.wake();
    else handleRef.current?.sleep();
  }, [awake]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
      {!live && <FlatBots awake={awake} tasks={tasks} />}
    </div>
  );
}

function FlatBots({ awake, tasks }: { awake: boolean; tasks: boolean }) {
  return (
    <>
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
            <svg
              viewBox="0 0 56 56"
              width={bot.size}
              height={bot.size}
              fill="none"
              className="block overflow-visible max-md:scale-75"
            >
              <FlatBotShape
                color={awake ? AGENT_COLORS[i] : "#ECECEC"}
                awake={awake}
                delay={delay}
              />
            </svg>
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
    </>
  );
}

// The flat fallback is drawn inline here rather than with <Bot>, so the page
// overlay doesn't also put 3D bots into these boxes.
function FlatBotShape({
  color,
  awake,
  delay,
}: {
  color: string;
  awake: boolean;
  delay: number;
}) {
  const fade = (property: string, duration: number) => ({
    transition: `${property} ${duration}s ease ${delay}s`,
  });
  return (
    <>
      <circle
        cx="28"
        cy="6"
        r="3.4"
        style={{ fill: color, ...fade("fill", 0.7) }}
      />
      <rect
        x="26.5"
        y="7"
        width="3"
        height="7"
        rx="1.5"
        style={{ fill: color, ...fade("fill", 0.7) }}
      />
      <rect
        x="7"
        y="13"
        width="42"
        height="36"
        rx="14"
        style={{ fill: color, ...fade("fill", 0.7) }}
      />
      <path
        d="M16 30q4.5 3.5 9 0M31 30q4.5 3.5 9 0"
        stroke="#B5B5B5"
        strokeWidth="3"
        strokeLinecap="round"
        style={{ opacity: awake ? 0 : 1, ...fade("opacity", 0.25) }}
      />
      <circle
        cx="20.5"
        cy="30"
        r="3.8"
        fill="#FFFFFF"
        style={{ opacity: awake ? 1 : 0, ...fade("opacity", 0.25) }}
      />
      <circle
        cx="35.5"
        cy="30"
        r="3.8"
        fill="#FFFFFF"
        style={{ opacity: awake ? 1 : 0, ...fade("opacity", 0.25) }}
      />
    </>
  );
}
