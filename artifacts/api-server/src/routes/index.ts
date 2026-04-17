import { Router, type IRouter } from "express";
import healthRouter from "./health";
import signalsRouter from "./signals";
import pairsRouter from "./pairs";
import newsRouter from "./news";
import authRouter from "./auth";
import adminRouter from "./admin";
import calendarRouter from "./calendar";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/signals", signalsRouter);
router.use("/pairs", pairsRouter);
router.use("/news", newsRouter);
router.use("/auth", authRouter);
router.use("/admin", adminRouter);
router.use("/calendar", calendarRouter);

export default router;
