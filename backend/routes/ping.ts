import { Hono } from "hono";
import createPingJob from "../controllers/createPingJob";
import getPingJob from "../controllers/getPingJob";
import getAllPingJobs from "../controllers/getAllPingJobs";
import updatePingJob from "../controllers/updatePingJob";

const pingRouter = new Hono();

pingRouter.post("/", createPingJob);
pingRouter.get("/:id", getPingJob);
pingRouter.get("/", getAllPingJobs);
pingRouter.patch("/:id", updatePingJob);

export default pingRouter;