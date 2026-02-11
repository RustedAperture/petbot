import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("discord.js", () => {
  class FakeContainer {
    texts: any[] = [];
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
  return {
    ContainerBuilder: FakeContainer,
    TextDisplayBuilder: FakeTextDisplay,
  };
});

import { buildGlobalStatsContainer } from "../../src/components/buildGlobalStatsContainer.js";

describe("buildGlobalStatsContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders numbers into the stats text", () => {
    const stats = {
      totalsByAction: {
        pet: { totalHasPerformed: 1234, totalUsers: 555 },
        bite: { totalHasPerformed: 10, totalUsers: 3 },
      },
      totalLocations: 7,
      totalUniqueUsers: 600,
    };

    const container = buildGlobalStatsContainer(stats as any);

    expect((container as any).texts.length).toBe(1);
    expect((container as any).texts[0].content).toContain(
      stats.totalsByAction.pet.totalHasPerformed.toLocaleString(),
    );
    expect((container as any).texts[0].content).toContain(
      "PetBot has visited 7",
    );
    expect((container as any).texts[0].content).toContain("has reached 600");
  });

  it("renders local title and omits unique locations when isLocal=true", () => {
    const stats = {
      totalsByAction: {
        pet: { totalHasPerformed: 12, totalUsers: 2 },
        bite: { totalHasPerformed: 3, totalUsers: 1 },
      },
      totalLocations: 1,
      totalUniqueUsers: 1,
    };

    const container = buildGlobalStatsContainer(stats as any, true);

    expect((container as any).texts.length).toBe(1);
    expect((container as any).texts[0].content).toContain(
      "Local Bot Statistics",
    );
    expect((container as any).texts[0].content).not.toContain(
      "PetBot has visited",
    );
    expect((container as any).texts[0].content).not.toContain("has reached");
  });
});
