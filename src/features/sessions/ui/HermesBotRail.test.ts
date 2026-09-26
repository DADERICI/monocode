import { describe, expect, it } from "vitest";
import { botColor, botInitial } from "./HermesBotRail";

describe("Hermes bot rail", () => {
  it("abbreviates bot names to one or two letters", () => {
    expect(botInitial("builder")).toBe("B");
    expect(botInitial("feature-tester")).toBe("FT");
    expect(botInitial("qa_bot")).toBe("QB");
    expect(botInitial("default")).toBe("D");
  });

  it("gives each bot a stable colour", () => {
    expect(botColor("builder")).toBe(botColor("builder"));
    expect(botColor("builder")).not.toBe(botColor("tester"));
    expect(botColor("builder")).toMatch(/^hsl\(\d+ 45% 42%\)$/);
  });
});
