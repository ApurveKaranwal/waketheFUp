import { Hono } from "hono";
import createPingJob from "../controllers/createPingJob";
import getPingJob from "../controllers/getPingJob";
import getAllPingJobs from "../controllers/getAllPingJobs";
import updatePingJob from "../controllers/updatePingJob";
import deletePingJob from "../controllers/deletePingJob";
import togglePingJob from "../controllers/togglePingJob";

const pingRouter = new Hono();

// Define root routes first to prevent parameter capture or slash mismatch
pingRouter.get("/", getAllPingJobs);
pingRouter.get("", getAllPingJobs);
pingRouter.post("/", createPingJob);
pingRouter.post("", createPingJob);

// Parameterized routes
pingRouter.get("/:id", getPingJob);
pingRouter.patch("/:id/toggle", togglePingJob);
pingRouter.patch("/:id", updatePingJob);
pingRouter.delete("/:id", deletePingJob);

export default pingRouter;