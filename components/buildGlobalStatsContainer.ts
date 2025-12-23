import { ContainerBuilder, TextDisplayBuilder } from "discord.js";

export function buildGlobalStatsContainer(stats: {
  totalHasPet: number;
  totalHasBitten: number;
  totalGuilds: number;
  totalPetUsers: number;
  totalBiteUsers: number;
  totalUsers: number;
  totalLocations: number;
}) {
  const container = new ContainerBuilder();
  const statsText = new TextDisplayBuilder();

  statsText.setContent(
    [
      "# Global Bot Statistics",
      "",
      "**Actions**",
      `${stats.totalHasPet.toLocaleString()} Pets Given`,
      `${stats.totalHasBitten.toLocaleString()} Bites Given`,
      "",
      "**User Engagement**",
      `${stats.totalPetUsers.toLocaleString()} have used Pet`,
      `${stats.totalBiteUsers.toLocaleString()} have used Bite`,
      "",
      "**Community Reach**",
      `PetBot has visited ${stats.totalLocations.toLocaleString()} unique locations`,
    ].join("\n"),
  );

  container.addTextDisplayComponents(statsText);

  return container;
}
