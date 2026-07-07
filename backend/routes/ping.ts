import { Hono } from "hono";
import createPingJob from "../controllers/createPingJob";

const pingRouter = new Hono();

pingRouter.post("/", createPingJob);

export default pingRouter;