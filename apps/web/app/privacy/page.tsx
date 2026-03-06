import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { findFileUpward } from "@/lib/fs";

// Helper that duplicates the lookup logic used by /api/privacy. We keep it
// simple and inline so the page doesn't rely on a network call, which avoids
// problems when the frontend port differs from whatever `fetch` assumes.
async function loadPolicy(): Promise<string> {
  const policyPath = await findFileUpward("privacy.md");

  if (!policyPath) {
    console.error("PrivacyPage: privacy.md not found");
    return "Unable to load privacy policy.";
  }

  try {
    const fs = await import("fs").then((m) => m.promises);
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
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </main>
  );
}
