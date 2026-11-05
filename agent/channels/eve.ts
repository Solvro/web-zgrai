import { type AuthFn, extractBearerToken, localDev } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";
import { isMasterInternalToken } from "@/lib/master/internal-auth";

// Only our own server drives the Master (src/lib/master/session.ts). The
// dashboard reads the space from the database, not from eve.
const appServer: AuthFn<Request> = async (request) => {
  const token = extractBearerToken(request.headers.get("authorization"));
  if (!isMasterInternalToken(token)) return null;
  return {
    authenticator: "zgrai-server",
    principalId: "zgrai-server",
    principalType: "service",
    attributes: {},
  };
};

// localDev() accepts every same-machine caller, which includes an ngrok tunnel,
// so it is opt-in for working on the agent in the eve terminal UI.
export default eveChannel({
  auth:
    process.env.EVE_ALLOW_LOCAL_DEV === "1"
      ? [appServer, localDev()]
      : [appServer],
});
