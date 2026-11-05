import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { auth, mcpResource } from "@/lib/auth";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>zgrai.pl</CardTitle>
          <CardDescription>
            <Suspense fallback={<Skeleton className="h-4 w-48" />}>
              <SessionStatus />
            </Suspense>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">MCP server URL</span>
          <code className="truncate font-mono">{mcpResource}</code>
        </CardContent>
        <CardFooter className="gap-2">
          <Button
            variant="secondary"
            render={<Link href="/spaces" />}
            nativeButton={false}
          >
            Dashboard
          </Button>
          <Suspense fallback={<Skeleton className="h-8 w-40" />}>
            <SessionActions />
          </Suspense>
        </CardFooter>
      </Card>
    </main>
  );
}

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

async function SessionStatus() {
  const session = await getSession();
  return session
    ? `Signed in as ${session.user.name} (${session.user.email})`
    : "You are not signed in.";
}

async function SessionActions() {
  const session = await getSession();
  if (session) return <SignOutButton />;

  return (
    <>
      <Button render={<Link href="/login" />} nativeButton={false}>
        Login
      </Button>
      <Button
        variant="outline"
        render={<Link href="/signup" />}
        nativeButton={false}
      >
        Sign up
      </Button>
    </>
  );
}
