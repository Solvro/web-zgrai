"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDashboardState } from "@/lib/dashboard/store";
import { InviteStep } from "./invite/invite-step";
import { LiveView } from "./live/live-view";
import { ShapingView } from "./shaping/shaping-view";

// Picks the screen for the space's stage: shaping a draft, or following it.
export function SpaceView({ id }: { id: string }) {
  const { spaces, viewer } = useDashboardState();
  const space = spaces[id];

  if (!space) {
    return (
      <div className="mx-auto w-full max-w-md p-6">
        <Card>
          <CardHeader>
            <CardTitle>Space not found</CardTitle>
            <CardDescription>
              The dashboard runs on mock data for now, so spaces you created
              are gone after a reload.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button render={<Link href="/spaces" />} nativeButton={false}>
              Back to spaces
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (space.status === "draft") return <ShapingView space={space} />;
  if (!space.inviteStepDone && viewer === "initiator") {
    return <InviteStep space={space} />;
  }
  return <LiveView space={space} />;
}
