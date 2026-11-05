export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // MASTER_DISABLED=1 keeps the server from driving the Master, e.g. when a
  // second process should own it.
  if (process.env.MASTER_DISABLED === "1") return;
  const { startMaster } = await import("./lib/master/runtime");
  startMaster();
}
