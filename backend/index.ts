import { serve } from "@hono/node-server";
import app from "./config/hono"

serve({
  fetch: app.fetch,
  port: 3000,
});

console.log("server is running");