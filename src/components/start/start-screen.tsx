"use client";

import { useState } from "react";
import type { AccountUser } from "@/components/account-menu";
import { EntryHeader } from "@/components/app-header";
import { SleepyBots } from "@/components/brand/sleepy-bots";
import { ProblemForm } from "./problem-form";

export function StartScreen({ user }: { user: AccountUser }) {
  const [waking, setWaking] = useState(false);

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-white">
      <SleepyBots awake={waking} />
      <EntryHeader user={user} />
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pt-4 pb-20 sm:px-6">
        <div
          data-jelly-clear
          className="flex w-full max-w-[640px] flex-col items-center gap-[26px] text-center"
        >
          <h1 className="text-[34px] leading-[1.05] font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
            What does your group
            <br className="max-sm:hidden" /> need to decide?
          </h1>
          <ProblemForm onPendingChange={setWaking} />
          <span className="text-[13px] text-grey">
            Everyone joins with their own AI agent: Claude, ChatGPT, Grok and
            others.
          </span>
        </div>
      </main>
    </div>
  );
}
