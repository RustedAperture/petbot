import { describe, it, expect, vi, beforeEach } from "vitest";

// Default: select returns no rows, update is a no-op
vi.mock("../../src/db/connector.js", () => ({
  drizzleDb: {
    select: vi.fn(() => ({
      from: () => ({
        where: () => ({ limit: () => Promise.resolve([]) }),
      }),
    })),
    update: vi.fn(() => ({
      set: () => ({ where: () => Promise.resolve() }),
    })),
  },
}));
vi.mock("../../src/db/schema.js", () => ({ actionData: {} }));
vi.mock("../../src/logger.js", () => ({
  default: { error: vi.fn() },
}));

import setImagesHandler from "../../src/http/api/setImages.js";
import { drizzleDb } from "../../src/db/connector.js";

// ── helpers ──────────────────────────────────────────────────────────────────

function makeRes() {
  return { writeHead: vi.fn(), end: vi.fn() } as any;
}

/**
 * Build a fake request that streams a JSON body exactly once.
 */
function makePostReq(body: unknown) {
  const bodyStr = JSON.stringify(body);
  return {
    method: "POST",
    url: "/api/setImages",
    headers: { host: "localhost" },
    on(event: string, cb: any) {
      if (event === "data") {
        cb(Buffer.from(bodyStr));
      }
      if (event === "end") {
        cb();
      }
    },
  } as any;
}

const validBody = {
  userId: "111",
  guildId: "999",
  actionType: "pet",
  images: ["https://example.com/pet.png", ""],
};

beforeEach(() => vi.clearAllMocks());

// ── method guard ──────────────────────────────────────────────────────────────

describe("setImagesHandler method guard", () => {
  it("GET → 405", async () => {
    const req = {
      method: "GET",
      url: "/api/setImages",
      headers: { host: "localhost" },
      on: vi.fn(),
    } as any;
    const res = makeRes();
    await setImagesHandler(req, res);
    expect(res.writeHead).toHaveBeenCalledWith(405, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "method_not_allowed" }),
    );
  });
});

// ── body/payload validation ───────────────────────────────────────────────────

describe("setImagesHandler validation", () => {
  it("invalid JSON body → 400 invalid_json", async () => {
    const req = {
      method: "POST",
      url: "/api/setImages",
      headers: { host: "localhost" },
      on(event: string, cb: any) {
        if (event === "data") {
          cb(Buffer.from("{ bad json"));
        }
        if (event === "end") {
          cb();
        }
      },
    } as any;
    const res = makeRes();
    await setImagesHandler(req, res);
    expect(res.writeHead).toHaveBeenCalledWith(400, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "invalid_json" }),
    );
  });

  it("non-numeric userId → 400 invalid_userId", async () => {
    const res = makeRes();
    await setImagesHandler(
      makePostReq({ ...validBody, userId: "not-a-number" }),
      res,
    );
    expect(res.writeHead).toHaveBeenCalledWith(400, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "invalid_userId" }),
    );
  });

  it("unknown actionType → 400 invalid_actionType", async () => {
    const res = makeRes();
    await setImagesHandler(
      makePostReq({ ...validBody, actionType: "slap" }),
      res,
    );
    expect(res.writeHead).toHaveBeenCalledWith(400, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "invalid_actionType" }),
    );
  });

  it("images not an array → 400 invalid_images", async () => {
    const res = makeRes();
    await setImagesHandler(
      makePostReq({ ...validBody, images: "https://example.com" }),
      res,
    );
    expect(res.writeHead).toHaveBeenCalledWith(400, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "invalid_images" }),
    );
  });

  it("more than 4 images → 400 invalid_images", async () => {
    const res = makeRes();
    await setImagesHandler(
      makePostReq({
        ...validBody,
        images: [
          "https://a.com",
          "https://b.com",
          "https://c.com",
          "https://d.com",
          "https://e.com",
        ],
      }),
      res,
    );
    expect(res.writeHead).toHaveBeenCalledWith(400, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "invalid_images" }),
    );
  });

  it("non-http(s) URL in images → 400 invalid_images", async () => {
    const res = makeRes();
    await setImagesHandler(
      makePostReq({ ...validBody, images: ["ftp://evil.com"] }),
      res,
    );
    expect(res.writeHead).toHaveBeenCalledWith(400, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "invalid_images" }),
    );
  });

  it("non-numeric guildId (without everywhere) → 400 invalid_guildId", async () => {
    const res = makeRes();
    await setImagesHandler(
      makePostReq({ ...validBody, guildId: "not-a-guild" }),
      res,
    );
    expect(res.writeHead).toHaveBeenCalledWith(400, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "invalid_guildId" }),
    );
  });
});

// ── not_found guard (no guild presence) ─────────────────────────────────────

describe("setImagesHandler not_found", () => {
  it("returns 404 when user has no rows at all for that guild (presence check)", async () => {
    // Both select calls return [] by default → presence check fails
    const res = makeRes();
    await setImagesHandler(makePostReq(validBody), res);
    expect(res.writeHead).toHaveBeenCalledWith(404, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "not_found" }),
    );
    expect((drizzleDb as any).update).not.toHaveBeenCalled();
  });
});

// ── successful update / insert ──────────────────────────────────────────────

describe("setImagesHandler successful update", () => {
  it("updates the existing action row when both presence and action rows are found", async () => {
    const presenceRow = { id: 1 };
    const actionRow = { id: 42 };
    // First select → presence check returns a row
    (drizzleDb.select as any).mockReturnValueOnce({
      from: () => ({
        where: () => ({ limit: () => Promise.resolve([presenceRow]) }),
      }),
    });
    // Second select → action-specific row found
    (drizzleDb.select as any).mockReturnValueOnce({
      from: () => ({
        where: () => ({ limit: () => Promise.resolve([actionRow]) }),
      }),
    });

    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const updateSet = vi.fn(() => ({ where: updateWhere }));
    (drizzleDb.update as any).mockReturnValueOnce({ set: updateSet });

    const res = makeRes();
    await setImagesHandler(makePostReq(validBody), res);

    expect(res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ ok: true }));
    expect(drizzleDb.update as any).toHaveBeenCalledTimes(1);
    const setCall = updateSet.mock.calls[0][0];
    // empty string in validBody.images is stripped by normalisation
    expect(setCall.images).toEqual(["https://example.com/pet.png"]);
  });

  it("inserts a new action row when user has guild presence but hasn't used that action yet", async () => {
    const presenceRow = { id: 1 };
    // First select → presence check passes
    (drizzleDb.select as any).mockReturnValueOnce({
      from: () => ({
        where: () => ({ limit: () => Promise.resolve([presenceRow]) }),
      }),
    });
    // Second select → no action-specific row
    (drizzleDb.select as any).mockReturnValueOnce({
      from: () => ({
        where: () => ({ limit: () => Promise.resolve([]) }),
      }),
    });

    const insertValues = vi.fn().mockResolvedValue(undefined);
    (drizzleDb as any).insert = vi.fn(() => ({ values: insertValues }));

    const res = makeRes();
    await setImagesHandler(makePostReq(validBody), res);

    expect(res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ ok: true }));
    expect((drizzleDb as any).insert).toHaveBeenCalledTimes(1);
    const inserted = insertValues.mock.calls[0][0];
    expect(inserted.userId).toBe(validBody.userId);
    expect(inserted.locationId).toBe(validBody.guildId);
    expect(inserted.actionType).toBe(validBody.actionType);
    // empty string in validBody.images is stripped by normalisation
    expect(inserted.images).toEqual(["https://example.com/pet.png"]);
    expect(inserted.hasPerformed).toBe(0);
    expect(inserted.hasReceived).toBe(0);
    expect((drizzleDb as any).update).not.toHaveBeenCalled();
  });

  it("everywhere=true issues a single bulk UPDATE without a prior SELECT", async () => {
    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const updateSet = vi.fn(() => ({ where: updateWhere }));
    (drizzleDb.update as any).mockReturnValueOnce({ set: updateSet });

    const res = makeRes();
    await setImagesHandler(
      makePostReq({
        userId: "111",
        actionType: "pet",
        images: ["https://example.com/pet.png"],
        everywhere: true,
      }),
      res,
    );

    expect(res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ ok: true }));
    // Exactly one UPDATE, no SELECT
    expect(drizzleDb.update as any).toHaveBeenCalledTimes(1);
    expect(drizzleDb.select as any).not.toHaveBeenCalled();
    const setCall = updateSet.mock.calls[0][0];
    expect(setCall.images).toEqual(["https://example.com/pet.png"]);
  });
});

// ── image normalisation ───────────────────────────────────────────────────────

describe("setImagesHandler image normalisation", () => {
  /** Helper: run the handler with a given images array and capture what was persisted. */
  async function capturePersistedImages(inputImages: unknown[]) {
    const presenceRow = { id: 1 };
    const actionRow = { id: 42 };
    (drizzleDb.select as any)
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({ limit: () => Promise.resolve([presenceRow]) }),
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({ limit: () => Promise.resolve([actionRow]) }),
        }),
      });
    const updateSet = vi.fn(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    }));
    (drizzleDb.update as any).mockReturnValueOnce({ set: updateSet });

    const res = makeRes();
    await setImagesHandler(
      makePostReq({ ...validBody, images: inputImages }),
      res,
    );
    return updateSet.mock.calls[0][0].images as string[];
  }

  it("strips empty strings before persisting", async () => {
    const persisted = await capturePersistedImages([
      "https://a.com",
      "",
      "https://b.com",
      "",
    ]);
    expect(persisted).toEqual(["https://a.com", "https://b.com"]);
  });

  it("trims whitespace from URLs before persisting", async () => {
    const persisted = await capturePersistedImages([
      "  https://a.com  ",
      " https://b.com",
    ]);
    expect(persisted).toEqual(["https://a.com", "https://b.com"]);
  });

  it("deduplicates identical URLs", async () => {
    const persisted = await capturePersistedImages([
      "https://a.com",
      "https://a.com",
      "https://b.com",
    ]);
    expect(persisted).toEqual(["https://a.com", "https://b.com"]);
  });

  it("persists an empty array when all entries are blank", async () => {
    const presenceRow = { id: 1 };
    const actionRow = { id: 42 };
    (drizzleDb.select as any)
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({ limit: () => Promise.resolve([presenceRow]) }),
        }),
      })
      .mockReturnValueOnce({
        from: () => ({
          where: () => ({ limit: () => Promise.resolve([actionRow]) }),
        }),
      });
    const updateSet = vi.fn(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    }));
    (drizzleDb.update as any).mockReturnValueOnce({ set: updateSet });

    const res = makeRes();
    await setImagesHandler(
      makePostReq({ ...validBody, images: ["", "  ", ""] }),
      res,
    );

    expect(res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "application/json",
    });
    expect(updateSet.mock.calls[0][0].images).toEqual([]);
  });
});
