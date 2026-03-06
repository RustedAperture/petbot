import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET(_req: Request) {
  // same path-walking logic as the changelog route, but for privacy.md
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
    console.error("/api/privacy error: privacy.md not found");
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const text = await fs.readFile(policyPath, "utf-8");
    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("/api/privacy error", err);
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
