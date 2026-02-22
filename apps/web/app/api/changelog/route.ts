import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET(_req: Request) {
  // walk upward from cwd until we find changelog.md; this covers both
  // normal Next.js runtime (cwd=apps/web) and the test runner (cwd=root).
  let changelogPath: string | null = null;
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, "changelog.md");
    try {
      await fs.access(candidate);
      changelogPath = candidate;
      break;
    } catch {
      dir = path.dirname(dir);
    }
  }

  if (!changelogPath) {
    console.error("/api/changelog error: changelog.md not found");
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const text = await fs.readFile(changelogPath, "utf-8");
    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("/api/changelog error", err);
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
