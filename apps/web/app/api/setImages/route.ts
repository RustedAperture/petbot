import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { proxyRequest } from "@/lib/proxy";
import { setImagesBody } from "@/lib/validation";
import { ZodError } from "zod";

export async function POST(req: Request) {
  let session;
  try {
    session = requireSession(req);
  } catch (e) {
    if (e instanceof Response) {
      return e as NextResponse;
    }
    throw e;
  }

  const userId = session.user!.id!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  let parsed: {
    guildId?: string;
    actionType: string;
    images: string[];
    everywhere: boolean;
  };
  try {
    parsed = setImagesBody.parse(body);
  } catch (e) {
    if (e instanceof ZodError) {
      const field = e.issues[0]?.path[0] as string | undefined;
      const errorKey = field ? `invalid_${field}` : "invalid_request";
      return NextResponse.json({ error: errorKey }, { status: 400 });
    }
    throw e;
  }

  return proxyRequest("/api/setImages", {
    method: "POST",
    body: {
      userId,
      guildId: parsed.guildId,
      actionType: parsed.actionType,
      images: parsed.images,
      everywhere: parsed.everywhere,
    },
  });
}
