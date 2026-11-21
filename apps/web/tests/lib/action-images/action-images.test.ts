import { describe, it, expect } from "vitest";
import { ownImages, placeOptions, splitOwnActions } from "@/lib/action-images";

describe("placeOptions", () => {
  it("keeps only session servers with PetBot data, sorted by name", () => {
    const guilds = [
      { id: "1", name: "Zebra Lounge", icon: null },
      { id: "2", name: "No data here" },
      { id: "3", name: "apple club" },
    ];
    expect(placeOptions(guilds, ["1", "3", "dm-channel"])).toEqual([
      { id: "3", name: "apple club" },
      { id: "1", name: "Zebra Lounge" },
    ]);
  });
});

describe("ownImages", () => {
  const DEFAULT = "https://cdn.example/pet.gif";

  it.each([
    ["only the default fallback", [DEFAULT], []],
    ["no images", undefined, []],
    [
      "a saved array that includes the default",
      [DEFAULT, "https://a/1.png"],
      [DEFAULT, "https://a/1.png"],
    ],
    [
      "blank and non-http slots",
      ["", "ftp://x", "https://a/2.png"],
      ["https://a/2.png"],
    ],
  ])("with %s", (_label, images, expected) => {
    expect(
      ownImages({
        totalHasPerformed: 0,
        totalUsers: 0,
        imageUrl: DEFAULT,
        images,
      }),
    ).toEqual(expected);
  });
});

describe("ownImages for an action the user created", () => {
  const IMAGE = "https://cdn.example/boop.gif";

  it.each([
    ["only its own image", [IMAGE], [IMAGE]],
    ["no images", undefined, [IMAGE]],
    [
      "slots the user set",
      [IMAGE, "https://a/1.png"],
      [IMAGE, "https://a/1.png"],
    ],
  ])(
    "with %s, counts the action image as theirs",
    (_label, images, expected) => {
      expect(
        ownImages(
          { totalHasPerformed: 0, totalUsers: 0, imageUrl: IMAGE, images },
          true,
        ),
      ).toEqual(expected);
    },
  );
});

describe("splitOwnActions", () => {
  it("keeps built-ins and your own actions together, in order, and the rest apart", () => {
    const entries: Array<[string, number]> = [
      ["pet", 1],
      ["shake", 2],
      ["test", 3],
      ["hug", 4],
      ["bother", 5],
    ];
    expect(splitOwnActions(entries, ["pet", "hug"], new Set(["test"]))).toEqual(
      {
        mine: [
          ["pet", 1],
          ["test", 3],
          ["hug", 4],
        ],
        others: [
          ["shake", 2],
          ["bother", 5],
        ],
      },
    );
  });
});
