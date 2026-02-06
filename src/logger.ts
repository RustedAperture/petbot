import pino from "pino";
import pretty from "pino-pretty";
import { metrics } from "../tui/bus.js";

const prettyStream = pretty({
  colorize: true,
  translateTime: "HH:MM:ss.l",
  ignore: "pid,hostname",
});

prettyStream.on("data", (chunk) => {
  const line = chunk.toString().replace(/\n+$/, "");
  if (line) metrics.emit("log", line);
});

const jsonDest = pino.destination({ dest: "app.json.log", sync: false });

const logger = pino(
  { level: "debug" },
  pino.multistream([
    { stream: jsonDest, level: "debug" },
    { stream: prettyStream, level: "debug" },
  ]),
);

export default logger;
