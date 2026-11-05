"use client";

import { FlaskConicalIcon, PauseIcon, PlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setSimulation, setViewer } from "@/lib/dashboard/actions";
import { useDashboardState } from "@/lib/dashboard/store";
import type { ViewerRole } from "@/lib/dashboard/types";

const SPEEDS = [1, 2, 5, 10];

// Controls for the mock simulation. They go away once real agents talk to
// the server.
export function DemoControls() {
  const { simulation, viewer } = useDashboardState();

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={simulation.paused ? "Resume simulation" : "Pause simulation"}
        onClick={() => setSimulation({ paused: !simulation.paused })}
      >
        {simulation.paused ? <PlayIcon /> : <PauseIcon />}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
          <FlaskConicalIcon />
          Demo · {simulation.speed}x
          {viewer === "participant" && " · participant view"}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Simulation speed</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={String(simulation.speed)}
              onValueChange={(value) => setSimulation({ speed: Number(value) })}
            >
              {SPEEDS.map((speed) => (
                <DropdownMenuRadioItem key={speed} value={String(speed)}>
                  {speed}x
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>View the dashboard as</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={viewer}
              onValueChange={(value) => setViewer(value as ViewerRole)}
            >
              <DropdownMenuRadioItem value="initiator">
                Initiator (admin)
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="participant">
                Participant (read-only)
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
