/* THIS FILE IS AUTO-GENERATED — lists all command modules as static imports to
   avoid runtime dynamic path imports (prevents scanner false-positives).

   If you add/remove commands under `src/commands/(slash|context)` either:
   - run `node ./scripts/generate-commands-index.mjs` (if present), or
   - update this file manually.
*/

// Slash commands
import bite from "./slash/bite.js";
import bonk from "./slash/bonk.js";
import botStats from "./slash/botStats.js";
import explode from "./slash/explode.js";
import hug from "./slash/hug.js";
import pet from "./slash/pet.js";
import random from "./slash/random.js";
import reset from "./slash/reset.js";
import serverSetup from "./slash/serverSetup.js";
import setCmd from "./slash/set.js";
import squish from "./slash/squish.js";
import stats from "./slash/stats.js";

// Context commands
import biteContext from "./context/biteContext.js";
import performContext from "./context/performContext.js";
import petContext from "./context/petContext.js";
import randomContext from "./context/randomContext.js";
import statsContext from "./context/statsContext.js";

export const slashCommands = [
  bite,
  bonk,
  botStats,
  explode,
  hug,
  pet,
  random,
  reset,
  serverSetup,
  setCmd,
  squish,
  stats,
];

export const contextCommands = [
  biteContext,
  performContext,
  petContext,
  randomContext,
  statsContext,
];
