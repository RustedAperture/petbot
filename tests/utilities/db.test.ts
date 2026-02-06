import { describe, it, expect, vi } from "vitest";

// Mock sqlite3 native bindings just in case
vi.mock("sqlite3", () => ({
  Database: vi.fn(),
  verbose: () => ({ Database: vi.fn() }),
}));

// Mock sequelize to avoid loading native DB bindings during tests
vi.mock("sequelize", () => {
  class FakeSequelize {
    constructor() {}
    query() {
      return Promise.resolve([]);
    }
  }
  const DataTypes = {
    INTEGER: "INTEGER",
    STRING: "STRING",
    DATE: "DATE",
    TEXT: "TEXT",
    JSON: "JSON",
  };
  class FakeModel {
    static init() {}
  }
  return { Sequelize: FakeSequelize, DataTypes, Model: FakeModel };
});

import { ActionData, BotData, sequelize } from "../../utilities/db.js";

describe("db exports", () => {
  it("exports models and sequelize instance", () => {
    expect(ActionData).toBeDefined();
    expect(BotData).toBeDefined();
    expect(sequelize).toBeDefined();

    // Basic sanity: models were initialized (we mock sequelize in tests)
    expect(typeof (ActionData as any).init).toBe("function");
    expect(typeof (BotData as any).init).toBe("function");
  });
});
