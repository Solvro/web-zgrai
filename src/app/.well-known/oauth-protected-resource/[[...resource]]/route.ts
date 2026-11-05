import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandler,
} from "mcp-handler";
import { authIssuer, mcpResource } from "@/lib/auth";

export const GET = protectedResourceHandler({
  authServerUrls: [authIssuer],
  resourceUrl: mcpResource,
});
export const OPTIONS = metadataCorsOptionsRequestHandler();
