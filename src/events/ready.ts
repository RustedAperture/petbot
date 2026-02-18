import { Client, Events } from "discord.js";
import logger from "../logger.js";

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: Client<boolean>) {
    logger.info(`Ready! Logged in as ${client.user!.tag}`);
  },
};
