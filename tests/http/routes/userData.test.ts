import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";

const { deleteMock } = vi.hoisted(() => ({
  deleteMock: vi.fn(),
}));

vi.mock("../../../src/db/connector.js", () => ({
  drizzleDb: { delete: deleteMock },
}));
vi.mock("../../../src/db/schema.js", () => ({
  actionData: { userId: Symbol("user_id") },
  optOut: { userId: Symbol("user_id") },
}));
vi.mock("../../../src/utilities/actionEvents.js", () => ({
  deleteActionEventsForUser: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../../src/utilities/customActions/store.js", () => ({
  deleteUserCustomActionData: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../../src/logger.js", () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { deleteUserCustomActionData } from "../../../src/utilities/customActions/store.js";
import { deleteActionEventsForUser } from "../../../src/utilities/actionEvents.js";
import { createApp } from "../../../src/http/expressServer.js";

describe("DELETE /api/userData/:userId", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.INTERNAL_API_SECRET;
    app = createApp();
  });

  it("deletes actionData and optOut rows for the user", async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    (deleteMock as any).mockReturnValue({ where });

    const res = await supertest(app).delete("/api/userData/u1").expect(200);

    expect(res.body).toEqual({ ok: true });
    expect(deleteMock).toHaveBeenCalledTimes(2);
    expect(where).toHaveBeenCalledTimes(2);
  });

  it("also deletes the user's action events", async () => {
    (deleteMock as any).mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    await supertest(app).delete("/api/userData/u1").expect(200);
    expect(deleteActionEventsForUser).toHaveBeenCalledWith("u1");
  });

  it("also deletes the user's custom action data", async () => {
    (deleteMock as any).mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    await supertest(app).delete("/api/userData/u1").expect(200);
    expect(deleteUserCustomActionData).toHaveBeenCalledWith("u1");
  });

  it("returns 404 for GET (method not registered)", async () => {
    await supertest(app).get("/api/userData/u1").expect(404);
  });

  it("returns 404 for POST (method not registered)", async () => {
    await supertest(app).post("/api/userData/u1").expect(404);
  });
});
