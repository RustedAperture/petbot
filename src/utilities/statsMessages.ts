import { ContainerBuilder, TextDisplayBuilder } from "discord.js";

const CARDS_PER_MESSAGE = 6;
const MAX_MESSAGES = 6;

/**
 * Groups stats cards into messages: Discord allows one reply plus five
 * follow-ups, and a V2 message holds 40 components (5 per card).
 */
export function groupStatsCards(
  containers: ContainerBuilder[],
): Array<Array<ContainerBuilder | TextDisplayBuilder>> {
  const messages: Array<Array<ContainerBuilder | TextDisplayBuilder>> = [];
  const maxCards = CARDS_PER_MESSAGE * MAX_MESSAGES;
  const capped = containers.slice(0, maxCards);
  for (let i = 0; i < capped.length; i += CARDS_PER_MESSAGE) {
    messages.push(capped.slice(i, i + CARDS_PER_MESSAGE));
  }
  if (containers.length > maxCards) {
    messages
      .at(-1)!
      .push(
        new TextDisplayBuilder().setContent(
          `Showing ${maxCards} of ${containers.length} actions.`,
        ),
      );
  }
  return messages;
}
