/**
 * Shared readiness state — set by src/index.ts during startup.
 * Checked by the /api/ready route.
 */
export const readiness = {
  botReady: false,
  dbReady: false,
};
