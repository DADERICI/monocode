import { describe, expect, it, vi } from "vitest";

vi.mock("../../../integrations/harness/providers/hermes/hermesProfiles", () => ({
  hermesProfiles: () => [
    { name: "default", isDefault: true, home: "/h", model: "zai/glm-5.3-flash" },
    { name: "builder", isDefault: false, home: "/h/b", model: "zai/glm-5.3" },
    { name: "tester", isDefault: false, home: "/h/t" },
  ],
}));

const { configuredModelLabel, displayModelName, hermesBotModelName } =
  await import("./modelDisplay");

describe("chat model display name", () => {
  it("names the bot's configured model instead of the placeholder", () => {
    expect(displayModelName("hermes", "hermes:default", { profile: "builder" })).toBe(
      "glm-5.3",
    );
    expect(displayModelName("hermes", "hermes:default", {})).toBe("glm-5.3-flash");
    expect(displayModelName("hermes", "hermes:default")).toBe("glm-5.3-flash");
  });

  it("keeps the placeholder when the bot's model is unknown", () => {
    expect(displayModelName("hermes", "hermes:default", { profile: "tester" })).toBe(
      "Configured model",
    );
    expect(hermesBotModelName("missing")).toBeUndefined();
  });

  it("leaves other chats and explicit models alone", () => {
    expect(displayModelName("claude", "claude:sonnet-5")).not.toBe("glm-5.3-flash");
    expect(configuredModelLabel("glm-5")).toBe("glm-5");
    expect(configuredModelLabel("zai/glm-5")).toBe("glm-5");
  });
});
