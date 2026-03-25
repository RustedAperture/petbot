import { describe, it, expect, vi, beforeEach } from "vitest";

const { readinessMock } = vi.hoisted(() => ({
  readinessMock: { botReady: false, dbReady: false },
}));

vi.mock("../../../src/http/readiness.js", () => ({
  readiness: readinessMock,
}));

import readyHandler from "../../../src/http/routes/ready.js";

function makeRes() {
  const res: any = {
    _status: 200,
    _body: undefined,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(body: unknown) {
      res._body = body;
      return res;
    },
  };
  return res;
}

describe("/api/ready route", () => {
  beforeEach(() => {
    readinessMock.botReady = false;
    readinessMock.dbReady = false;
  });

  it("returns 503 when neither bot nor db is ready", () => {
    const res = makeRes();
    readyHandler({} as any, res);

    expect(res._status).toBe(503);
    expect(res._body).toEqual({
      ready: false,
      bot: false,
      db: false,
    });
  });

  it("returns 503 when only db is ready", () => {
    readinessMock.dbReady = true;

    const res = makeRes();
    readyHandler({} as any, res);

    expect(res._status).toBe(503);
    expect(res._body).toEqual({
      ready: false,
      bot: false,
      db: true,
    });
  });

  it("returns 503 when only bot is ready", () => {
    readinessMock.botReady = true;

    const res = makeRes();
    readyHandler({} as any, res);

    expect(res._status).toBe(503);
    expect(res._body).toEqual({
      ready: false,
      bot: true,
      db: false,
    });
  });

  it("returns 200 when both bot and db are ready", () => {
    readinessMock.botReady = true;
    readinessMock.dbReady = true;

    const res = makeRes();
    readyHandler({} as any, res);

    expect(res._status).toBe(200);
    expect(res._body).toEqual({
      ready: true,
      bot: true,
      db: true,
    });
  });
});
