"use client";

import { ArrowUpIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { messageMasterAction } from "@/app/actions";

export function MasterInput({
  spaceId,
  onSent,
}: {
  spaceId: string;
  onSent: () => void;
}) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!text.trim() || pending) return;
        startTransition(async () => {
          const result = await messageMasterAction(spaceId, text);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          setText("");
          onSent();
        });
      }}
      className="mt-2.5 flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white py-1.5 pr-1.5 pl-[18px] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.05)]"
    >
      <label htmlFor="master-input" className="sr-only">
        Message the Master
      </label>
      <input
        id="master-input"
        type="text"
        autoComplete="off"
        value={text}
        disabled={pending}
        onChange={(event) => setText(event.target.value)}
        placeholder="Message the Master"
        className="min-h-11 min-w-0 flex-1 border-none bg-transparent text-[15px] text-ink outline-none placeholder:text-grey-light"
      />
      <button
        type="submit"
        aria-label="Send"
        disabled={pending || !text.trim()}
        className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-ink text-white transition-opacity disabled:cursor-default disabled:opacity-40"
      >
        <ArrowUpIcon className="size-[18px]" strokeWidth={2.2} />
      </button>
    </form>
  );
}
