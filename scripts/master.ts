import "dotenv/config";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { space } from "@/db/schema";
import {
  ask,
  closeSpaceAsMaster,
  getActivitySince,
  getMasterContext,
  pin,
  postMasterMessage,
  propose,
  recordDecision,
  updateNotes,
} from "@/lib/spaces/master";

const USAGE = `Act as the Master from the terminal, for testing without eve.

  pnpm master spaces
  pnpm master context <space_id>
  pnpm master activity <space_id>
  pnpm master say <space_id> <text>
  pnpm master ask <space_id> <question> [participant_id ...]
  pnpm master dm <space_id> <participant_id> <text>
  pnpm master propose <space_id> <proposal>
  pnpm master decide <space_id> <title> <content>
  pnpm master notes <space_id> <content>
  pnpm master pin <space_id> <title> <content>
  pnpm master close <space_id> <summary>`;

async function main() {
  const [command, spaceId, ...rest] = process.argv.slice(2);
  switch (command) {
    case "spaces": {
      const rows = await db
        .select({ id: space.id, title: space.title, status: space.status })
        .from(space)
        .orderBy(desc(space.createdAt))
        .limit(20);
      console.table(rows);
      break;
    }
    case "context": {
      const ctx = await getMasterContext(spaceId);
      console.log(`# ${ctx.space.title}\nGoal: ${ctx.space.goal}\n`);
      console.table(ctx.participants);
      console.log(ctx.transcript);
      console.log(ctx.boxes);
      if (ctx.tallies.length > 0) console.table(ctx.tallies);
      break;
    }
    case "activity":
      for (const row of await getActivitySince(spaceId))
        console.log(`#${row.id} ${row.summary}`);
      break;
    case "say":
      console.log(
        (await postMasterMessage({ spaceId, text: rest.join(" ") })).id,
      );
      break;
    case "ask": {
      const [question, ...participantIds] = rest;
      console.log((await ask({ spaceId, question, participantIds })).id);
      break;
    }
    case "dm": {
      const [participantId, ...text] = rest;
      console.log(
        (
          await postMasterMessage({
            spaceId,
            text: text.join(" "),
            privateTo: [participantId],
          })
        ).id,
      );
      break;
    }
    case "propose":
      console.log((await propose({ spaceId, proposal: rest.join(" ") })).id);
      break;
    case "decide":
      console.log(
        (
          await recordDecision({
            spaceId,
            title: rest[0],
            content: rest.slice(1).join(" "),
          })
        ).id,
      );
      break;
    case "notes":
      console.log(await updateNotes(spaceId, rest.join(" ")));
      break;
    case "pin":
      console.log(
        await pin({
          spaceId,
          title: rest[0],
          content: rest.slice(1).join(" "),
        }),
      );
      break;
    case "close":
      await closeSpaceAsMaster(spaceId, rest.join(" "));
      console.log("closed");
      break;
    default:
      console.log(USAGE);
      process.exit(command ? 1 : 0);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
