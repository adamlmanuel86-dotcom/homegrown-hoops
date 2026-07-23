import { Router, type IRouter } from "express";
import healthRouter from "./health";
import teamsRouter from "./teams";
import playersRouter from "./players";
import gamesRouter from "./games";
import statsRouter from "./stats";
import profilesRouter from "./profiles";
import adminRouter from "./admin";
import gameVideosRouter from "./gameVideos";
import storageRouter from "./storage";
import cloudinaryRouter from "./cloudinary";
import isoBallRouter from "./iso-ball";
import arcadeRouter from "./arcade";
import trackGameRouter from "./trackGame";

const router: IRouter = Router();

router.use(healthRouter);
router.use(teamsRouter);
router.use(playersRouter);
router.use(gamesRouter);
router.use(statsRouter);
router.use(profilesRouter);
router.use(adminRouter);
router.use(gameVideosRouter);
router.use(storageRouter);
router.use(cloudinaryRouter);
router.use(isoBallRouter);
router.use(arcadeRouter);
router.use(trackGameRouter);

export default router;
