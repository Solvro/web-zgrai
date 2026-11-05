import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginScreen } from "@/components/login-screen";
import { googleConfigured } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { getSession } from "@/lib/session";

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <Suspense>
      <Login {...props} />
    </Suspense>
  );
}

async function Login({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(params.next);
  // During an MCP OAuth flow the page carries a signed query; stay on it.
  if (!params.sig && (await getSession())) redirect(next);
  return <LoginScreen googleEnabled={googleConfigured} next={next} />;
}
