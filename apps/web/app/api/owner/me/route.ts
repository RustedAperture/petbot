import { NextResponse } from "next/server";
import { isOwner, requireSession } from "@/lib/auth";

export function GET(req: Request) {
  let isCallerOwner = false;
  try {
    isCallerOwner = isOwner(requireSession(req));
  } catch {
    // no valid session means not the owner
  }
  return NextResponse.json({ isOwner: isCallerOwner });
}
