"use client";

import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createInviteAction } from "@/app/actions";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyMessageButton, InviteMessageBlock } from "./invite-message";

// The message the admin sends to the group. Codes are stored hashed, so
// without a fresh one from the start flow it mints a new invite.
export function useInviteMessage(spaceId: string, initial: string | null) {
  const [message, setMessage] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    createInviteAction(spaceId).then((result) => {
      if (cancelled) return;
      if (result.ok) setMessage(result.data.message);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [spaceId, initial]);

  return { message, error };
}

export function InviteMessage({
  spaceId,
  initialMessage,
  children,
}: {
  spaceId: string;
  initialMessage: string | null;
  children?: (message: string) => React.ReactNode;
}) {
  const { message, error } = useInviteMessage(spaceId, initialMessage);
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!message)
    return (
      <Skeleton className="h-[118px] w-full rounded-[14px] bg-[#F0F0F0]" />
    );
  return (
    <>
      <InviteMessageBlock message={message} />
      {children?.(message)}
    </>
  );
}

export function InviteCard({
  spaceId,
  initialMessage,
}: {
  spaceId: string;
  initialMessage: string | null;
}) {
  return (
    <div className="flex w-full flex-col gap-3.5 rounded-[22px] border border-[#E5E5E5] bg-white p-[18px] text-left shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_rgba(0,0,0,0.07)]">
      <InviteMessage spaceId={spaceId} initialMessage={initialMessage}>
        {(message) => (
          <div className="flex flex-wrap gap-2.5">
            <CopyMessageButton message={message} className="flex-[1_1_200px]" />
            <Link
              href={`/spaces/${spaceId}`}
              className="inline-flex min-h-12 flex-[1_1_200px] items-center justify-center gap-2 rounded-[14px] bg-ink text-[15px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Open dashboard
              <ArrowRightIcon className="size-4" strokeWidth={2.2} />
            </Link>
          </div>
        )}
      </InviteMessage>
      <span className="text-center text-[13px] text-grey">
        Add your own agent too: paste the message into your chat.
      </span>
    </div>
  );
}
