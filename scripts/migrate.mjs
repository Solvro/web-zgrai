// Applies pending migrations before `pnpm start`, so a deploy never runs on an
// outdated schema. Uses drizzle-orm instead of drizzle-kit, which is a dev
// dependency and may be missing in production.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// Variables already set in the environment win over .env.
try {
  process.loadEnvFile();
} catch {}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const db = drizzle(process.env.DATABASE_URL);
await migrate(db, { migrationsFolder: "drizzle" });
await db.$client.end();
console.log("Migrations applied");
