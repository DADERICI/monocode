import { beforeEach, describe, expect, it } from "vitest";
import {
  botForSession,
  forgetBotChat,
  ongoingBotChat,
  rememberBotChat,
} from "./hermesBotChats";

beforeEach(() => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    },
  });
});

describe("Hermes bot chats", () => {
  it("keeps one ongoing chat per bot per project", () => {
    rememberBotChat("/work/app", "builder", "s1", true);
    rememberBotChat("/work/app/", "tester", "s2", true);
    rememberBotChat("/work/other", "builder", "s3", true);

    expect(ongoingBotChat("/work/app", "builder")).toBe("s1");
    expect(ongoingBotChat("/work/app", "tester")).toBe("s2");
    expect(ongoingBotChat("/work/other", "builder")).toBe("s3");
    expect(ongoingBotChat("/work/new", "builder")).toBeUndefined();
  });

  it("labels extra chats without replacing the ongoing one", () => {
    rememberBotChat("/work/app", "builder", "s1", true);
    rememberBotChat("/work/app", "builder", "s9", false);

    expect(ongoingBotChat("/work/app", "builder")).toBe("s1");
    expect(botForSession("s9")).toBe("builder");
    expect(botForSession("ordinary")).toBeUndefined();
  });

  it("forgets a chat that no longer exists", () => {
    rememberBotChat("/work/app", "builder", "s1", true);
    forgetBotChat("s1");

    expect(ongoingBotChat("/work/app", "builder")).toBeUndefined();
    expect(botForSession("s1")).toBeUndefined();
  });

  it("recovers from corrupt storage", () => {
    localStorage.setItem("monocode.hermesBotChats.v1", "{not json");
    expect(ongoingBotChat("/work/app", "builder")).toBeUndefined();
    rememberBotChat("/work/app", "builder", "s1", true);
    expect(ongoingBotChat("/work/app", "builder")).toBe("s1");
  });
});
