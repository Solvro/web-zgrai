import "dotenv/config";
import { spawn } from "node:child_process";
import ngrok from "@ngrok/ngrok";

const port = Number(process.env.PORT ?? 3000);

if (!process.env.NGROK_AUTHTOKEN) {
  console.error(
    "Set NGROK_AUTHTOKEN in .env (https://dashboard.ngrok.com/get-started/your-authtoken).",
  );
  process.exit(1);
}

const listener = await ngrok.forward({
  addr: port,
  authtoken: process.env.NGROK_AUTHTOKEN,
  domain: process.env.NGROK_DOMAIN || undefined,
});
const url = listener.url();
const host = new URL(url).hostname;

console.log(`\nTunnel:     ${url}`);
console.log(`MCP server: ${url}/api/mcp`);
console.log(`Skill:      ${url}/skill.md\n`);

const next = spawn("pnpm", ["exec", "next", "dev", "--port", String(port)], {
  stdio: "inherit",
  env: { ...process.env, BETTER_AUTH_URL: url, TUNNEL_HOST: host },
});

const stop = async () => {
  next.kill("SIGINT");
  await ngrok.disconnect();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
next.on("exit", async (code) => {
  await ngrok.disconnect();
  process.exit(code ?? 0);
});
