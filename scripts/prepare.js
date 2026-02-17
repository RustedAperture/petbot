#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();

// Skip in CI or other non-interactive environments
const isCI = !!(
  process.env.CI ||
  process.env.GITHUB_ACTIONS ||
  process.env.GITLAB_CI ||
  process.env.CIRCLECI ||
  process.env.JENKINS_HOME
);
if (isCI) {
  process.exit(0);
}

// Only run husky install in an actual git checkout
if (!fs.existsSync(path.join(root, ".git"))) {
  // no .git directory (common in Docker build / sparse installs)
  process.exit(0);
}

// Ensure husky is available (devDependencies may be omitted in CI/docker installs)
const huskyBin = path.join(root, "node_modules", ".bin", "husky");
if (!fs.existsSync(huskyBin)) {
  // husky isn't installed — nothing to do
  process.exit(0);
}

// Run `husky install` and mirror its exit status
const res = spawnSync(huskyBin, ["install"], { stdio: "inherit" });
process.exit(res.status ?? 0);
