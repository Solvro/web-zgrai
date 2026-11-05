import { type AuthFn, localDev } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";
import { auth } from "@/lib/auth";

const appSession: AuthFn<Request> = async (request) => {
  const result = await auth.api.getSession({ headers: request.headers });
  if (!result) return null;
  return {
    authenticator: "better-auth",
    principalId: result.user.id,
    principalType: "user",
    attributes: {},
  };
};

export default eveChannel({
  auth: [appSession, localDev()],
});
