"use client";

import { BrainIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DemoControls } from "./demo-controls";

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-4 px-4">
        <Link href="/spaces" className="flex items-center gap-2 font-semibold">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BrainIcon className="size-4" />
          </span>
          Grokownik
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Button variant="ghost" size="sm" render={<Link href="/spaces" />} nativeButton={false}>
            Spaces
          </Button>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <DemoControls />
          <Button size="sm" render={<Link href="/spaces/new" />} nativeButton={false}>
            <PlusIcon />
            New space
          </Button>
        </div>
      </div>
    </header>
  );
}
