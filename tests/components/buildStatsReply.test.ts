import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("discord.js", () => {
  class FakeContainer {
    accent: any = null;
    media: any[] = [];
    sections: any[] = [];
    setAccentColor(val: any) {
      this.accent = val;
    }
    addMediaGalleryComponents(g: any) {
      this.media.push(g);
    }
    addSectionComponents(s: any) {
      this.sections.push(s);
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
  class FakeSection {
    text: any[] = [];
    thumb: any = null;
    addTextDisplayComponents(t: any) {
      this.text.push(t);
    }
    setThumbnailAccessory(t: any) {
      this.thumb = t;
    }
  }
  class FakeThumbnail {
    url = "";
    setURL(u: string) {
      this.url = u;
      return this;
    }
  }

  return {
    ContainerBuilder: FakeContainer,
    TextDisplayBuilder: FakeTextDisplay,
    MediaGalleryBuilder: FakeMediaGallery,
    SectionBuilder: FakeSection,
    ThumbnailBuilder: FakeThumbnail,
  };
});

vi.mock("@utils/helper.js", () => ({
  getAccentColor: vi.fn().mockReturnValue([1, 2, 3]),
  getName: vi
    .fn()
    .mockImplementation((u: any) => u.username || u.displayName || "Name"),
}));

import { buildStatsReply } from "@components/buildStatsReply.js";

describe("buildStatsReply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a stats container with text and thumbnail", () => {
    const data = { get: (k: string) => (k === "has_been_pet" ? 2 : 10) } as any;
    const images = ["a.png", "b.png"];
    const target = {
      username: "Tester",
      displayAvatarURL: () => "http://avatar",
    } as any;

    const container = buildStatsReply(data, images, target, "pet", 7);

    expect((container as any).accent).toEqual([1, 2, 3]);
    expect((container as any).media.length).toBe(1);
    expect((container as any).media[0].items.length).toBe(2);
    expect((container as any).sections.length).toBe(1);
    expect((container as any).sections[0].thumb.url).toBe("http://avatar");
    expect((container as any).sections[0].text[0].content).toContain(
      "Tester pet stats",
    );
  });
});
