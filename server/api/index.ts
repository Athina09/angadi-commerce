import type { IncomingMessage, ServerResponse } from "http";
import serverless from "serverless-http";

type Handler = ReturnType<typeof serverless>;

let cached: Handler | null = null;
let initError: Error | null = null;

async function getHandler(): Promise<Handler> {
  if (cached) return cached;
  if (initError) throw initError;

  try {
    const { createApp } = await import("../dist/createApp.js");
    const { app } = createApp({ serverless: true });
    cached = serverless(app);
    return cached;
  } catch (err) {
    initError = err instanceof Error ? err : new Error(String(err));
    throw initError;
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const h = await getHandler();
    return h(req, res);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "boot_failed", message, stack }));
    }
  }
}
