import { BrainIcon, ServerIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/dashboard/format";
import type { Presence } from "@/lib/dashboard/selectors";
import { cn } from "@/lib/utils";

const COLORS = [
  "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  "bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-200",
  "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
];

export function personColor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length];
}

const PRESENCE_DOT: Record<Presence, string> = {
  online: "bg-emerald-500",
  idle: "bg-amber-400",
  offline: "bg-muted-foreground/40",
  left: "bg-muted-foreground/40",
  removed: "bg-destructive",
};

export function PersonAvatar({
  name,
  presence,
  size = "default",
}: {
  name: string;
  presence?: Presence;
  size?: "default" | "sm" | "lg";
}) {
  return (
    <Avatar size={size}>
      <AvatarFallback className={cn("font-medium", personColor(name))}>
        {initials(name)}
      </AvatarFallback>
      {presence && (
        <span
          className={cn(
            "absolute right-0 bottom-0 z-10 size-2.5 rounded-full ring-2 ring-background",
            PRESENCE_DOT[presence],
          )}
        />
      )}
    </Avatar>
  );
}

export function MasterAvatar({ size = "default" }: { size?: "default" | "sm" | "lg" }) {
  return (
    <Avatar size={size}>
      <AvatarFallback className="bg-primary text-primary-foreground">
        <BrainIcon className="size-4" />
      </AvatarFallback>
    </Avatar>
  );
}

export function SystemAvatar({ size = "default" }: { size?: "default" | "sm" | "lg" }) {
  return (
    <Avatar size={size}>
      <AvatarFallback>
        <ServerIcon className="size-4" />
      </AvatarFallback>
    </Avatar>
  );
}
