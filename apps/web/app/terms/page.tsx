import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { findFileUpward } from "@/lib/fs";

// Similar to the privacy page; avoid a network call so the page works even
// when the frontend and API ports differ.
async function loadTerms(): Promise<string> {
  const policyPath = await findFileUpward("terms.md");

  if (!policyPath) {
    console.error("TermsPage: terms.md not found");
    return "Unable to load terms of service.";
  }

  try {
    const fs = await import("fs").then((m) => m.promises);
    return await fs.readFile(policyPath, "utf-8");
  } catch (err) {
    console.error("TermsPage: failed to read terms file", err);
    return "Unable to load terms of service.";
  }
}

export default async function TermsPage() {
  const body = await loadTerms();

  return (
    <main className="prose dark:prose-invert p-4">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </main>
  );
}
