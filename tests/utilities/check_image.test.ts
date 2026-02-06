import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type fetchType from "node-fetch";

vi.mock("node-fetch", () => ({ default: vi.fn() }));
vi.mock("dns/promises", () => ({ lookup: vi.fn() }));

import fetch from "node-fetch";
import { lookup } from "dns/promises";
import { checkImage } from "../../src/utilities/check_image";

beforeEach(() => {
  vi.restoreAllMocks();
  delete process.env.ALLOWED_IMAGE_HOSTS;
});

describe("checkImage", () => {
  it("returns true for valid http image", async () => {
    (fetch as unknown as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "image/png" },
    });

    const ok = await checkImage("http://example.com/image.png");
    expect(ok).toBe(true);
  });

  it("returns false for non-image content type", async () => {
    (fetch as unknown as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "text/html" },
    });

    const ok = await checkImage("http://example.com/page.html");
    expect(ok).toBe(false);
  });

  it("rejects non-http protocols without calling fetch", async () => {
    const fetchMock = fetch as unknown as any;
    fetchMock.mockClear();

    const ok = await checkImage("file:///etc/passwd");
    expect(ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks literal localhost IPs without calling fetch", async () => {
    const fetchMock = fetch as unknown as any;
    fetchMock.mockClear();

    const ok = await checkImage("http://127.0.0.1/secret");
    expect(ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks hostname that resolves to private IP", async () => {
    const fetchMock = fetch as unknown as any;
    fetchMock.mockClear();

    (lookup as unknown as any).mockResolvedValue([{ address: "10.0.0.5", family: 4 }]);

    const ok = await checkImage("http://some-host/whatever");
    expect(ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects redirects", async () => {
    (fetch as unknown as any).mockResolvedValue({
      ok: false,
      status: 301,
      headers: { get: () => "image/png" },
    });

    const ok = await checkImage("http://example.com/redirect");
    expect(ok).toBe(false);
  });

  it("returns false on fetch timeout/error", async () => {
    (fetch as unknown as any).mockRejectedValue(new Error("aborted"));

    const ok = await checkImage("http://example.com/slow");
    expect(ok).toBe(false);
  });

  it("enforces allowlist when configured", async () => {
    process.env.ALLOWED_IMAGE_HOSTS = "example.com,images.example.net";

    // not allowed host
    const notOk = await checkImage("http://bad.com/img.png");
    expect(notOk).toBe(false);

    // allowed subdomain
    (fetch as unknown as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => "image/webp" },
    });
    const ok = await checkImage("http://cdn.example.com/pic.webp");
    expect(ok).toBe(true);
  });
});
