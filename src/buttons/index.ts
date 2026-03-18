import {
  handleResetButton,
  customIdPrefix as resetCustomIdPrefix,
} from "./reset.js";
import type { ButtonInteraction } from "discord.js";

export type ButtonHandler = {
  matches: (customId: string) => boolean;
  execute: (interaction: ButtonInteraction) => Promise<void>;
};

export const buttonHandlers: ButtonHandler[] = [
  {
    matches: (customId) => customId.startsWith(resetCustomIdPrefix),
    execute: handleResetButton,
  },
];
