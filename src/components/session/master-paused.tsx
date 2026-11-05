"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { continueMasterAction } from "@/app/actions";
import { Spinner } from "@/components/ui/spinner";

// The Master stops at its token budget until the initiator lets it go on.
export function MasterPaused({
  spaceId,
  admin,
  onContinued,
}: {
  spaceId: string;
  admin: boolean;
  onContinued: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#FED7AA] bg-[#FFF7ED] px-4 py-3">
      <span className="text-sm text-step-text">
        {admin
          ? "The Master used up its token budget and paused."
          : "The Master is paused until the admin lets it continue."}
      </span>
      {admin && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await continueMasterAction(spaceId);
              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              onContinued();
            })
          }
          className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending && <Spinner />}
          Let it continue
        </button>
      )}
    </div>
  );
}
