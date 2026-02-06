export * from "../src/events/ready.js";

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: Client<boolean>) {
    sequelize.sync();
    logger.info(`Ready! Logged in as ${client.user!.tag}`);
  },
};
