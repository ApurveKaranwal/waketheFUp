import app from "./app";
import "./workers/pingWorker"; //the import itself starts the worker, we dont need to assign it a variable.

Bun.serve({
  fetch: app.fetch,
  port: 3000,
});

console.log("server is running");