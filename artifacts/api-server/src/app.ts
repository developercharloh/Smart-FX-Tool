import express, { type Express } from "express";
import cors from "cors";
import pinoHttp, { type Options as PinoHttpOptions } from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

const httpLogger = (pinoHttp as unknown as (opts: PinoHttpOptions) => any)({
  logger,
  serializers: {
    req(req: any) {
      return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
    },
    res(res: any) {
      return { statusCode: res.statusCode };
    },
  },
});
app.use(httpLogger);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
