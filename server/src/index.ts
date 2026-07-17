import { createApp } from "./createApp.js";
import { startDemoSimulation } from "./lib/demoSim.js";

const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;

const { app, httpServer } = createApp({ serverless: false });

if (!httpServer) {
  throw new Error("HTTP server not created");
}

httpServer.listen(PORT, () => {
  console.log(`Angadi API listening on :${PORT}`);
  console.log(`CORS origin: ${CLIENT_ORIGIN ?? "(none)"}`);
  startDemoSimulation();
});
