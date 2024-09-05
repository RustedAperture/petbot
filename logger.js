const pino = require("pino");
const logger = pino();
logger.level = "debug";
module.exports = logger;
