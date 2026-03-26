import { NextResponse } from "next/server";
import {
  getInternalApiBase,
  internalApiHeadersOptional,
} from "../../../lib/internal-api";

/**
 * GET /api/stats — global stats (public, no auth required).
 */
export async function GET() {
  const target = `${getInternalApiBase()}/api/stats`;
  const res = await fetch(target, {
    headers: internalApiHeadersOptional(),
  });
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return NextResponse.json(json, { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
