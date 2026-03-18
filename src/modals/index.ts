import {
  handlePerformModal,
  customIdPrefix as performModalPrefix,
} from "./performModal.js";
import {
  handleServerSetupModal,
  customId as serverSetupModalId,
} from "./serverSetupModal.js";
import type { ModalSubmitInteraction } from "discord.js";

export type ModalHandler = {
  matches: (customId: string) => boolean;
  execute: (modal: ModalSubmitInteraction) => Promise<void>;
};

export const modalHandlers: ModalHandler[] = [
  {
    matches: (customId) => customId.startsWith(performModalPrefix),
    execute: handlePerformModal,
  },
  {
    matches: (customId) => customId === serverSetupModalId,
    execute: handleServerSetupModal,
  },
];
