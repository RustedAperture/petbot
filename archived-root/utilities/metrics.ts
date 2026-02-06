export * from "../src/utilities/metrics.js";

export function emitEvent(name: string): void {
  try {
    metrics.emit("event", name);
  } catch {}
}

export function emitCommand(name: string): void {
  emitEvent(`cmd:${name}`);
}

export { metrics } from "../tui/bus.js";
