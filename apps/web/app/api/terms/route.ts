import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { findFileUpward } from "@/lib/fs";

export async function GET(_req: Request) {
  const policyPath = await findFileUpward("terms.md");

  if (!policyPath) {
    console.error("/api/terms error: terms.md not found");
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const text = await fs.readFile(policyPath, "utf-8");
    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("/api/terms error", err);
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
