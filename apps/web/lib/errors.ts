import { NextResponse } from "next/server";

export function apiError(status: number, error: string): NextResponse {
  return NextResponse.json({ error }, { status });
}
