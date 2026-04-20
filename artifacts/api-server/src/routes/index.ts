import { Router, type IRouter } from "express";
import healthRouter from "./health";
import teamsRouter from "./teams";
import playersRouter from "./players";
import gamesRouter from "./games";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(teamsRouter);
router.use(playersRouter);
router.use(gamesRouter);
router.use(statsRouter);

export default router;
