import { headers } from "next/headers";
import Link from "next/link";
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
import { auth, mcpResource } from "@/lib/auth";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Solvrownicy w piaskownicy</CardTitle>
          <CardDescription>
            {session
              ? `Signed in as ${session.user.name} (${session.user.email})`
              : "You are not signed in."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">MCP server URL</span>
          <code className="truncate font-mono">{mcpResource}</code>
        </CardContent>
        <CardFooter className="gap-2">
          {session ? (
            <SignOutButton />
          ) : (
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
          )}
        </CardFooter>
      </Card>
    </main>
  );
}
