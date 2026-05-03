import app from "./app";
import { logger } from "./lib/logger";
import { runMigrations } from "./lib/migrate";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function main() {
  await runMigrations();

  // Log Clerk config status at startup so Railway logs immediately reveal
  // whether the secret key is present and which instance it belongs to.
  const clerkSecret = process.env.CLERK_SECRET_KEY ?? "";
  logger.info(
    {
      CLERK_SECRET_KEY_set: !!clerkSecret,
      // Show the key type prefix (sk_test_ / sk_live_) without exposing the secret
      CLERK_SECRET_KEY_prefix: clerkSecret ? clerkSecret.substring(0, 12) : "(not set)",
      NODE_ENV: process.env.NODE_ENV,
    },
    "Clerk configuration",
  );

  const server = app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });

  function shutdown() {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  }

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  logger.error({ err }, "Startup failed");
  process.exit(1);
});
