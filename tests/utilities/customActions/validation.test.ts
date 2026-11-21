import { describe, expect, it } from "vitest";
import {
  RESERVED_ACTION_NAMES,
  validateCustomActionInput,
} from "../../../src/utilities/customActions/validation.js";

describe("validateCustomActionInput", () => {
  it.each([
    ["boop", "booped", { name: "boop", phrase: "booped" }],
    ["  Boop ", " Booped ", { name: "boop", phrase: "booped" }],
    ["bo0p", "booped", { error: "Names can only use letters a–z (1–20)." }],
    [
      "pet",
      "petted",
      { error: "That name is already a built-in action or command." },
    ],
    [
      "action",
      "x",
      { error: "That name is already a built-in action or command." },
    ],
    [
      "boop",
      "@everyone",
      { error: "Phrases can't contain mentions, links or formatting." },
    ],
    [
      "boop",
      "see https://x",
      { error: "Phrases can't contain mentions, links or formatting." },
    ],
    [
      "boop",
      "two\nlines",
      { error: "Phrases can't contain mentions, links or formatting." },
    ],
    ["boop", "a".repeat(33), { error: "Phrases must be 1–32 characters." }],
    ["boop", "   ", { error: "Phrases must be 1–32 characters." }],
  ])("validateCustomActionInput(%j, %j)", (name, phrase, expected) => {
    expect(validateCustomActionInput({ name, phrase })).toEqual(expected);
  });

  it("trims a valid name and phrase", () => {
    expect(validateCustomActionInput({ name: " boop ", phrase: " hi " })).toEqual(
      { name: "boop", phrase: "hi" },
    );
  });

  it("reserves every command name", () => {
    expect(RESERVED_ACTION_NAMES).toEqual(
      expect.arrayContaining(["action", "perform", "stats", "pet"]),
    );
  });
});
