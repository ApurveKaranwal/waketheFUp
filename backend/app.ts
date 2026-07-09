import { Hono } from "hono";
import pingRouter from "./routes/ping";
const app = new Hono();
app.route("/ping", pingRouter);
export default app