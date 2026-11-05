"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// The invite as the design shows it: the request in white, then aligned
// "key value" lines. The copied text keeps the full URLs.
export function InviteMessageBlock({ message }: { message: string }) {
  const [headline, ...lines] = message.split("\n");
  return (
    <div className="flex flex-col overflow-x-auto rounded-[14px] bg-ink px-[18px] py-4 font-mono text-[13px] leading-[1.7] text-[#E5E5E5] sm:text-sm">
      <span className="text-white">{headline}</span>
      {lines.map((line) => {
        const match = line.match(/^(\S+)(\s+)(.*)$/);
        if (!match) return <span key={line}>{line}</span>;
        const [, key, gap, value] = match;
        return (
          <span key={line} className="whitespace-pre">
            <span className="text-[#8A8A8A]">
              {key}
              {gap}
            </span>
            {value.replace(/^https?:\/\//, "")}
          </span>
        );
      })}
    </div>
  );
}

export function CopyMessageButton({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(message);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Couldn't copy. Select the text and copy it by hand.");
        }
      }}
      className={cn(
        "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-[#E5E5E5] bg-white px-4 text-[15px] font-medium text-ink transition-colors hover:bg-[#FAFAFA]",
        className,
      )}
    >
      {copied ? (
        <CheckIcon className="size-4" />
      ) : (
        <CopyIcon className="size-4" strokeWidth={1.8} />
      )}
      {copied ? "Copied" : "Copy message"}
    </button>
  );
}
