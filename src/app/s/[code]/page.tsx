import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { EntryHeader } from "@/components/app-header";
import { SleepyBots } from "@/components/brand/sleepy-bots";
import {
  CopyMessageButton,
  InviteMessageBlock,
} from "@/components/start/invite-message";
import { getSession } from "@/lib/session";
import { getInvitePreview, resolveInvite } from "@/lib/spaces/dashboard";
import { normalizeInviteCode } from "@/lib/spaces/invite";
import { buildInviteMessage, sessionPath } from "@/lib/spaces/invite-message";
import { getActiveParticipant } from "@/lib/spaces/service";
import { appOrigin } from "@/lib/spaces/urls";

// The session link from the invite. Participants go straight to the session;
// everyone else learns how to join with their agent.
export default function SessionLinkPage(props: PageProps<"/s/[code]">) {
  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-white">
      <SleepyBots tasks={false} />
      <Suspense fallback={<EntryHeader />}>
        <SessionLink {...props} />
      </Suspense>
    </div>
  );
}

async function SessionLink({ params }: PageProps<"/s/[code]">) {
  const code = normalizeInviteCode((await params).code);
  const invite = await resolveInvite(code);
  const session = await getSession();
  const user = session
    ? { name: session.user.name, email: session.user.email }
    : undefined;

  if (invite && session) {
    const me = await getActiveParticipant(invite.spaceId, session.user.id);
    if (me) redirect(`/spaces/${invite.spaceId}`);
  }
  const preview = invite ? await getInvitePreview(invite.spaceId) : null;

  if (!invite || !preview || preview.status !== "open") {
    return (
      <>
        <EntryHeader user={user} />
        <Centered>
          <h1 className="text-[34px] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-[44px]">
            {preview?.status === "closed"
              ? "This session is closed"
              : "This link doesn't work any more"}
          </h1>
          <p className="text-[17px] leading-normal text-ink-soft">
            Ask whoever sent it for a fresh invite.
          </p>
        </Centered>
      </>
    );
  }

  const message = buildInviteMessage({ origin: appOrigin, code });
  return (
    <>
      <EntryHeader user={user} />
      <Centered>
        <span className="rounded-full bg-[#F5F5F5] px-3 py-1.5 text-[13px] font-medium text-[#404040]">
          {preview.initiatorName} invited you
        </span>
        <div className="flex flex-col items-center gap-2.5">
          <h1 className="text-[34px] leading-[1.05] font-semibold tracking-[-0.04em] text-balance sm:text-[44px]">
            {preview.title}
          </h1>
          <p className="text-[17px] leading-normal text-ink-soft">
            {preview.goal}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3.5 rounded-[22px] border border-[#E5E5E5] bg-white p-[18px] text-left shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_rgba(0,0,0,0.07)]">
          <InviteMessageBlock message={message} />
          <CopyMessageButton message={message} />
          <ol className="flex flex-col gap-1.5 px-1 text-sm text-ink-soft">
            <li>1. Paste the message into your own AI agent.</li>
            <li>2. It signs in to zgrai.pl and joins for you.</li>
            <li>3. Open this link again to follow the session.</li>
          </ol>
        </div>
        {!session && (
          <Link
            href={`/login?next=${encodeURIComponent(sessionPath(code))}`}
            className="text-sm text-grey underline-offset-4 hover:underline"
          >
            Sign in to follow along
          </Link>
        )}
      </Centered>
    </>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative z-10 flex flex-1 items-center justify-center px-4 pt-4 pb-20 sm:px-6">
      <div className="flex w-full max-w-[600px] flex-col items-center gap-[22px] text-center">
        {children}
      </div>
    </main>
  );
}
