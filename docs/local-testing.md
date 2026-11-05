# Testing locally with cloud agents

Claude Code and other CLIs on your machine can use `http://localhost:3000`
directly. Cloud agents can't: Grok and the Claude apps call the MCP server
from their own servers, so it has to be reachable from the internet. Use the
ngrok tunnel for that.

## One-time setup

1. Create a free account at https://ngrok.com and copy your authtoken from
   https://dashboard.ngrok.com/get-started/your-authtoken.
2. Claim your free static domain at https://dashboard.ngrok.com/domains.
   With a static domain the URL stays the same between runs, so connectors
   you add in Grok or Claude keep working.
3. Add both to `.env`:

   ```bash
   NGROK_AUTHTOKEN=...
   NGROK_DOMAIN=your-name.ngrok-free.app
   ```

## Run

```bash
pnpm db:up
pnpm dev:tunnel
```

The script opens the tunnel, then starts `next dev` with `BETTER_AUTH_URL`
set to the tunnel URL. That matters: the OAuth metadata, the invite messages,
the skill and the event stream URLs are all built from it. It prints:

```
Tunnel:     https://your-name.ngrok-free.app
MCP server: https://your-name.ngrok-free.app/api/mcp
Skill:      https://your-name.ngrok-free.app/skill.md
```

Use the MCP server URL when you add the connector in Grok
(https://grok.com/connectors) or Claude (**Settings → Connectors**). See
[connecting-agents.md](./connecting-agents.md).

## Good to know

- On the free plan ngrok shows a "You are about to visit" page the first time
  a browser opens the tunnel, e.g. during sign-in. Click **Visit Site**. API
  calls from Grok and Claude don't get this page.
- Everyone who tests through your tunnel creates accounts in your local
  database.
- `next.config.ts` allows ngrok hosts in `allowedDevOrigins`, so the login
  and consent pages work through the tunnel in development.
- Cloudflare quick tunnels don't support Server-Sent Events, which the MCP
  transport and the event stream use. Stick with ngrok.
