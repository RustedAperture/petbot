import { ACTIONS } from "../../types/constants.js";

const COMMAND_NAMES = [
  "action",
  "custom-action",
  "set",
  "reset",
  "server-set",
  "server-setup",
  "stats",
  "leaderboard",
  "random",
  "botstats",
  "perform",
];

export const RESERVED_ACTION_NAMES: readonly string[] = [
  ...Object.keys(ACTIONS),
  ...COMMAND_NAMES,
];

const NAME_PATTERN = /^[a-z]{1,20}$/;
const FORBIDDEN_PHRASE_PATTERN = /[@<>`*_~|#]|https?:|:\/\/|discord\.gg/i;
const MAX_PHRASE_LENGTH = 32;

export function validateCustomActionInput(input: {
  name: string;
  phrase: string;
}): { name: string; phrase: string } | { error: string } {
  const name = input.name.trim();
  const phrase = input.phrase.trim();

  if (!NAME_PATTERN.test(name)) {
    return { error: "Names can only use lowercase letters a–z (1–20)." };
  }
  if (RESERVED_ACTION_NAMES.includes(name)) {
    return { error: "That name is already a built-in action or command." };
  }
  if (phrase.length < 1 || phrase.length > MAX_PHRASE_LENGTH) {
    return { error: "Phrases must be 1–32 characters." };
  }
  if (FORBIDDEN_PHRASE_PATTERN.test(phrase)) {
    return { error: "Phrases can't contain mentions, links or formatting." };
  }
  return { name, phrase };
}
