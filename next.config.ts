import type { NextConfig } from "next";
import { withEve } from "eve/next";

const tunnelHosts = ["*.ngrok-free.app", "*.ngrok.app", "*.ngrok.dev"];
if (process.env.TUNNEL_HOST) tunnelHosts.push(process.env.TUNNEL_HOST);

const nextConfig: NextConfig = {
  allowedDevOrigins: tunnelHosts,
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withEve(nextConfig);
