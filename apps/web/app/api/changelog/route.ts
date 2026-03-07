import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { findFileUpward } from "@/lib/fs";

export async function GET(_req: Request) {
  const changelogPath = await findFileUpward("changelog.md");

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
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
