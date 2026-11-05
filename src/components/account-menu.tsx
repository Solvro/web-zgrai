"use client";

import { LayoutListIcon, LogOutIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth-client";

export type AccountUser = { name: string; email: string };

export function AccountMenu({ user }: { user: AccountUser }) {
  const router = useRouter();
  const initial = (user.name || user.email).trim()[0]?.toUpperCase() ?? "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account: ${user.name}`}
        className="size-10 cursor-pointer rounded-full border border-[#E5E5E5] bg-[#F5F5F5] text-sm font-semibold text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
      >
        {initial}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 py-1.5">
            <span className="text-sm font-medium text-ink">{user.name}</span>
            <span className="truncate font-normal">{user.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/spaces" />}>
          <LayoutListIcon />
          Your problems
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            router.push("/");
            router.refresh();
          }}
        >
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
