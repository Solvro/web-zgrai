import { redirect } from "next/navigation";
import { Suspense } from "react";
import { sessionPath } from "@/lib/spaces/invite-message";

export default function JoinRedirect(props: PageProps<"/join/[code]">) {
  return (
    <Suspense>
      <Redirect {...props} />
    </Suspense>
  );
}

async function Redirect({ params }: PageProps<"/join/[code]">) {
  return redirect(sessionPath((await params).code));
}
