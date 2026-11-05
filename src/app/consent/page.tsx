import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { firstParam, toQueryString } from "@/lib/search-params";
import { ConsentActions } from "./consent-actions";

export default async function ConsentPage({
  searchParams,
}: PageProps<"/consent">) {
  const params = await searchParams;
  const requestHeaders = await headers();

  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) redirect(`/login${toQueryString(params)}`);

  const clientId = firstParam(params.client_id) ?? "";
  const scopes = (firstParam(params.scope) ?? "").split(" ").filter(Boolean);

  const client = await auth.api
    .getOAuthClientPublic({
      query: { client_id: clientId },
      headers: requestHeaders,
    })
    .catch(() => null);

  const clientName = client?.client_name ?? clientId;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Authorize {clientName}</CardTitle>
          <CardDescription>
            {clientName} wants to access your account as {session.user.email}.
          </CardDescription>
        </CardHeader>
        {scopes.length > 0 && (
          <CardContent className="flex flex-wrap gap-2">
            {scopes.map((scope) => (
              <Badge key={scope} variant="secondary">
                {scope}
              </Badge>
            ))}
          </CardContent>
        )}
        <CardFooter>
          <ConsentActions />
        </CardFooter>
      </Card>
    </div>
  );
}
