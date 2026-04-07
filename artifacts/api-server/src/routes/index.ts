import { Router, type IRouter } from "express";
import healthRouter from "./health";
import signalsRouter from "./signals";
import pairsRouter from "./pairs";
import newsRouter from "./news";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/signals", signalsRouter);
router.use("/pairs", pairsRouter);
router.use("/news", newsRouter);

export default router;
