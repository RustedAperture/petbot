import { NextResponse } from "next/server";
import { getInternalApiBase, internalApiHeadersOptional } from "./internal-api";
import { apiError } from "./errors";

type ProxyOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  forwardContentType?: boolean;
  stripInternalDetails?: boolean;
};

export async function proxyRequest(
  path: string,
  options?: ProxyOptions,
): Promise<NextResponse> {
  const base = getInternalApiBase();
  const url = `${base}${path}`;

  const headers: Record<string, string> = {
    ...internalApiHeadersOptional(),
    ...options?.headers,
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: options?.method ?? "GET",
      headers,
      body:
        options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    return apiError(503, "upstream_unavailable");
  }

  const text = await res.text();

  if (options?.forwardContentType) {
    const contentType = res.headers.get("content-type") ?? "application/json";
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": contentType },
    });
  }

  try {
    let json = JSON.parse(text);
    if (
      options?.stripInternalDetails &&
      res.status >= 500 &&
      json &&
      typeof json === "object"
    ) {
      const { details: _, ...rest } = json;
      json = rest;
    }
    return NextResponse.json(json, { status: res.status });
  } catch {
    return new NextResponse(text, { status: res.status });
  }
}
