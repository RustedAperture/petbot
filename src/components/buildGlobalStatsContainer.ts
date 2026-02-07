import { ContainerBuilder, TextDisplayBuilder } from "discord.js";
import { ACTIONS } from "../types/constants.js";

export function buildGlobalStatsContainer(stats: {
  totalsByAction: Record<
    string,
    { totalHasPerformed: number; totalUsers: number }
  >;
  totalLocations: number;
}) {
  const container = new ContainerBuilder();
  const statsText = new TextDisplayBuilder();

  const lines: string[] = ["# Global Bot Statistics", "", "**Actions**"];

  const actionKinds = Object.keys(ACTIONS);

  for (const kind of actionKinds) {
    const num = stats.totalsByAction?.[kind]?.totalHasPerformed ?? 0;
    const noun = ACTIONS[kind].noun;
    const label = noun.charAt(0).toUpperCase() + noun.slice(1) + "s Given";
    lines.push(`${num.toLocaleString()} ${label}`);
  }

  lines.push("", "**User Engagement**");

  for (const kind of actionKinds) {
    const users = stats.totalsByAction?.[kind]?.totalUsers ?? 0;
    const noun = ACTIONS[kind].noun;
    const label = noun.charAt(0).toUpperCase() + noun.slice(1);
    lines.push(`${users.toLocaleString()} have used ${label}`);
  }

  lines.push("", "**Community Reach**");
  lines.push(
    `PetBot has visited ${stats.totalLocations.toLocaleString()} unique locations`,
  );

  statsText.setContent(lines.join("\n"));

  container.addTextDisplayComponents(statsText);

  return container;
}
