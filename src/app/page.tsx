import { Suspense } from "react";
import { LoginScreen } from "@/components/login-screen";
import { StartScreen } from "@/components/start/start-screen";
import { googleConfigured } from "@/lib/auth";
import { getSession } from "@/lib/session";

export default function Home() {
  return (
    <Suspense>
      <HomeScreen />
    </Suspense>
  );
}

// Signed out: 01 · sign in. Signed in: 02 · describe the problem.
async function HomeScreen() {
  const session = await getSession();
  if (!session)
    return <LoginScreen googleEnabled={googleConfigured} next="/" />;
  return (
    <StartScreen
      user={{ name: session.user.name, email: session.user.email }}
    />
  );
}
