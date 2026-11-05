import { type AccountUser, AccountMenu } from "@/components/account-menu";
import { Wordmark } from "@/components/brand/wordmark";

// The header of the signed-in pages: the wordmark opens "Your problems".
export function AppHeader({
  user,
  title,
  actions,
}: {
  user: AccountUser;
  title?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-x-5 gap-y-3 px-4 py-3.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Wordmark href="/spaces" />
          {title && (
            <>
              <span aria-hidden="true" className="text-xl text-[#D4D4D4]">
                /
              </span>
              <h1 className="truncate text-[17px] font-semibold tracking-[-0.01em]">
                {title}
              </h1>
            </>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          {actions}
          <AccountMenu user={user} />
        </div>
      </div>
    </header>
  );
}

// The header of the entry screens (sign in, start): a bigger wordmark.
export function EntryHeader({ user }: { user?: AccountUser }) {
  return (
    <header className="relative z-10 flex items-center justify-between gap-4 px-4 py-5 sm:px-7">
      <Wordmark size="lg" href={user ? "/spaces" : undefined} />
      {user && <AccountMenu user={user} />}
    </header>
  );
}
