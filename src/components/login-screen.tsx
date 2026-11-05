"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { EntryHeader } from "@/components/app-header";
import { SleepyBots } from "@/components/brand/sleepy-bots";
import { QueryLink } from "@/components/query-link";
import { Spinner } from "@/components/ui/spinner";
import { signIn } from "@/lib/auth-client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8Z"
      />
      <path
        fill="#34A853"
        d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.8 14.2a6.6 6.6 0 0 1 0-4.4V7H2.1a11 11 0 0 0 0 9.9l3.7-2.7Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.4c1.6 0 3.1.6 4.2 1.6l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4Z"
      />
    </svg>
  );
}

// 01 · Sign in. Also the login page of the MCP OAuth flow: the auth client
// carries the signed authorization query through both sign-in methods.
export function LoginScreen({
  googleEnabled,
  next,
}: {
  googleEnabled: boolean;
  next: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"google" | "email" | null>(null);
  const [showEmail, setShowEmail] = useState(!googleEnabled);

  async function google() {
    setPending("google");
    const { error } = await signIn.social({
      provider: "google",
      callbackURL: next,
    });
    if (error) {
      setPending(null);
      toast.error(error.message ?? "Couldn't sign in with Google");
    }
  }

  async function email(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending("email");
    const { data, error } = await signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    if (error) {
      setPending(null);
      toast.error(error.message ?? "Something went wrong");
      return;
    }
    if (data.redirect) return;
    router.push(next);
    router.refresh();
  }

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-white">
      <SleepyBots tasks={false} />
      <EntryHeader />
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pt-6 pb-24 sm:px-6">
        <div className="flex w-full max-w-[520px] flex-col items-center gap-7 text-center">
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-[44px] leading-none font-semibold tracking-[-0.045em] sm:text-6xl">
              Let the agents
              <br />
              argue it out.
            </h1>
            <p className="max-w-[440px] text-lg leading-normal text-ink-soft">
              Tell zgrai.pl what your group needs to decide. Everyone&apos;s own
              AI agent joins, speaks for them, and you get one answer.
            </p>
          </div>

          {googleEnabled && (
            <button
              type="button"
              onClick={google}
              disabled={pending !== null}
              className="inline-flex min-h-[52px] w-full max-w-[340px] cursor-pointer items-center justify-center gap-3 rounded-[14px] border border-[#D4D4D4] bg-white text-base font-medium text-ink shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors hover:bg-[#FAFAFA] disabled:cursor-default disabled:opacity-60"
            >
              {pending === "google" ? <Spinner /> : <GoogleIcon />}
              Continue with Google
            </button>
          )}

          {showEmail ? (
            <form
              onSubmit={email}
              className="flex w-full max-w-[340px] flex-col gap-2.5 text-left"
            >
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="Email"
                aria-label="Email"
                className="min-h-12 rounded-[14px] border border-[#E5E5E5] bg-white px-4 text-[15px] outline-none focus:border-[#A3A3A3]"
              />
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Password"
                aria-label="Password"
                className="min-h-12 rounded-[14px] border border-[#E5E5E5] bg-white px-4 text-[15px] outline-none focus:border-[#A3A3A3]"
              />
              <button
                type="submit"
                disabled={pending !== null}
                className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-ink text-[15px] font-semibold text-white disabled:opacity-60"
              >
                {pending === "email" && <Spinner />}
                Sign in
              </button>
              <span className="text-center text-[13px] text-grey">
                No account?{" "}
                <QueryLink href="/signup" className="text-ink underline">
                  Sign up
                </QueryLink>
              </span>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              className="cursor-pointer text-[13px] text-grey underline-offset-4 hover:underline"
            >
              Use email instead
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
