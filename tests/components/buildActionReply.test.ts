import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock discord.js builders used by the component
vi.mock("discord.js", () => {
  class FakeContainer {
    accent: any = null;
    media: any[] = [];
    texts: any[] = [];
    setAccentColor(val: any) {
      this.accent = val;
    }
    addMediaGalleryComponents(g: any) {
      this.media.push(g);
    }
    addTextDisplayComponents(t: any) {
      this.texts.push(t);
    }
  }
  class FakeTextDisplay {
    content = "";
    setContent(c: string) {
      this.content = c;
      return this;
    }
  }
  class FakeMediaGallery {
    items: any[] = [];
    addItems(items: any[]) {
      this.items.push(...items);
      return this;
    }
  }

  return {
    ContainerBuilder: FakeContainer,
    TextDisplayBuilder: FakeTextDisplay,
    MediaGalleryBuilder: FakeMediaGallery,
  };
});

vi.mock("@utils/helper.js", () => ({
  getAccentColor: vi.fn().mockReturnValue([11, 22, 33]),
  getName: vi
    .fn()
    .mockImplementation((u: any) => u.name || u.username || "NAME"),
}));
vi.mock("../../logger.js", () => ({ default: { debug: vi.fn() } }));

import { buildActionReply } from "@components/buildActionReply.js";

describe("buildActionReply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("constructs a container with media gallery and text components", () => {
    const target = {
      id: "123",
      name: "TargetName",
      displayHexColor: "#000000",
    } as any;
    const author = { id: "456", name: "AuthorName" } as any;

    const container = buildActionReply(
      target,
      author,
      "g1",
      "pet",
      "http://img",
      5 as any,
    );

    expect((container as any).accent).toEqual([11, 22, 33]);
    expect((container as any).media.length).toBe(1);
    expect((container as any).media[0].items[0].media.url).toBe("http://img");
    expect((container as any).texts.length).toBeGreaterThanOrEqual(2);
    expect((container as any).texts[0].content).toContain("<@123>");
    expect((container as any).texts[1].content).toContain(
      "has been pet 5 times".replace("5", "5"),
    );
  });
});
