import { promises as fs } from "fs";
import path from "path";

/**
 * Walks upward from the current working directory looking for a file with
 * the given name. Returns the absolute path if found, or `null` otherwise.
 *
 * The search is bounded by `maxDepth` iterations to avoid walking past the
 * filesystem root; the default of 5 mirrors the previous ad‑hoc logic used in
 * several places.
 */
export async function findFileUpward(
  filename: string,
  maxDepth = 5,
): Promise<string | null> {
  let dir = process.cwd();

  for (let i = 0; i < maxDepth; i++) {
    const candidate = path.join(dir, filename);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      dir = path.dirname(dir);
    }
  }

  return null;
}
