import serverless from "serverless-http";
import { createApp } from "./createApp.js";
import { startDemoSimulation } from "./lib/demoSim.js";

const isVercel = Boolean(process.env.VERCEL);
const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;

const { app, httpServer } = createApp({ serverless: isVercel });

if (!isVercel && httpServer) {
  httpServer.listen(PORT, () => {
    console.log(`Angadi API listening on :${PORT}`);
    console.log(`CORS origin: ${CLIENT_ORIGIN ?? "(none)"}`);
    startDemoSimulation();
  });
}

export default isVercel ? serverless(app) : undefined;
