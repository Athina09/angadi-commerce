import { createApp } from "../server/dist/createApp.js";

const { app } = createApp({ serverless: true });

export default app;
