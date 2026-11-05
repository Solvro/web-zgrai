"use client";

import type { Space } from "@/lib/dashboard/types";
import { StageStepper } from "../stage-stepper";
import { DraftEditor } from "./draft-editor";
import { ShapingChat } from "./shaping-chat";

// Stage 1 of the dashboard: the initiator and the Master turn a loose
// description into a goal, subproblems and constraints.
export function ShapingView({ space }: { space: Space }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <StageStepper current={1} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <ShapingChat space={space} />
        <DraftEditor space={space} />
      </div>
    </div>
  );
}
