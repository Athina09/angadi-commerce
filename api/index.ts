import serverless from "serverless-http";
import { createApp } from "../server/dist/createApp.js";

const { app } = createApp({ serverless: true });

export default serverless(app);
