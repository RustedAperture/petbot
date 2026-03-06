import React from "react";
import ReactMarkdown from "react-markdown";
import { promises as fs } from "fs";
import path from "path";

// Helper that duplicates the lookup logic used by /api/privacy. We keep it
// simple and inline so the page doesn't rely on a network call, which avoids
// problems when the frontend port differs from whatever `fetch` assumes.
async function loadPolicy(): Promise<string> {
  let policyPath: string | null = null;
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, "privacy.md");
    try {
      await fs.access(candidate);
      policyPath = candidate;
      break;
    } catch {
      dir = path.dirname(dir);
    }
  }

  if (!policyPath) {
    console.error("PrivacyPage: privacy.md not found");
    return "Unable to load privacy policy.";
  }

  try {
    return await fs.readFile(policyPath, "utf-8");
  } catch (err) {
    console.error("PrivacyPage: failed to read policy file", err);
    return "Unable to load privacy policy.";
  }
}

export default async function PrivacyPage() {
  const body = await loadPolicy();

  return (
    <main className="prose dark:prose-invert p-4">
      <ReactMarkdown>{body}</ReactMarkdown>
    </main>
  );
}
