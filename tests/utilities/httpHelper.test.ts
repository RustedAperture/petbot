import { describe, it, expect, vi } from "vitest";
import { PassThrough } from "node:stream";
import {
  isAllowedMethod,
  parseJsonBody,
} from "../../src/utilities/httpHelper.js";

describe("httpHelper.isAllowedMethod", () => {
  it("returns true for allowed methods and does not write response", () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as import("node:http").ServerResponse;

    const result = isAllowedMethod("GET", ["GET", "PATCH"], res);

    expect(result).toBe(true);
    expect(res.writeHead).not.toHaveBeenCalled();
    expect(res.end).not.toHaveBeenCalled();
  });

  it("returns false and writes 405 with Allow header for disallowed methods", () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as import("node:http").ServerResponse;

    const result = isAllowedMethod("POST", ["GET", "PATCH"], res);

    expect(result).toBe(false);
    expect(res.writeHead).toHaveBeenCalledWith(405, {
      "Content-Type": "application/json",
      Allow: "GET, PATCH",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "method_not_allowed" }),
    );
  });
});

describe("httpHelper.parseJsonBody", () => {
  it("parses JSON body from a stream", async () => {
    const req = new PassThrough();
    const json = JSON.stringify({ hello: "world" });

    const parsePromise = parseJsonBody<{ hello: string }>(
      req as unknown as import("node:http").IncomingMessage,
    );

    req.write(json);
    req.end();

    await expect(parsePromise).resolves.toEqual({ hello: "world" });
  });

  it("rejects empty body", async () => {
    const req = new PassThrough();
    const parsePromise = parseJsonBody(
      req as unknown as import("node:http").IncomingMessage,
    );
    req.end();
    await expect(parsePromise).rejects.toThrow("empty_body");
  });

  it("rejects invalid JSON", async () => {
    const req = new PassThrough();
    const parsePromise = parseJsonBody(
      req as unknown as import("node:http").IncomingMessage,
    );

    req.write("{ invalid json }");
    req.end();

    await expect(parsePromise).rejects.toThrow();
  });

  it("rejects when body exceeds maxBodySize", async () => {
    const req = new PassThrough();

    const parsePromise = parseJsonBody(
      req as unknown as import("node:http").IncomingMessage,
      { maxBodySize: 10 },
    );

    req.write("1234567890");
    req.write("x");
    req.end();

    await expect(parsePromise).rejects.toThrow("Payload too large");
  });

  it("propagates stream errors", async () => {
    const req = new PassThrough();
    const parsePromise = parseJsonBody(
      req as unknown as import("node:http").IncomingMessage,
    );

    req.emit("error", new Error("stream error"));

    await expect(parsePromise).rejects.toThrow("stream error");

    expect(req.listenerCount("data")).toBe(0);
    expect(req.listenerCount("end")).toBe(0);
    expect(req.listenerCount("error")).toBe(0);
  });

  it("removes listeners after completion", async () => {
    const req = new PassThrough();
    const parsePromise = parseJsonBody(
      req as unknown as import("node:http").IncomingMessage,
    );

    req.write(JSON.stringify({ a: 1 }));
    req.end();

    await expect(parsePromise).resolves.toEqual({ a: 1 });

    expect(req.listenerCount("data")).toBe(0);
    expect(req.listenerCount("end")).toBe(0);
    expect(req.listenerCount("error")).toBe(0);
  });
});
