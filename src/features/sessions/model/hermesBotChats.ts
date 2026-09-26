import { pathKey } from "../../../shared/lib/paths";

/**
 * Which MonoCode chats belong to which Hermes bot (profile).
 *
 * Hermes Desktop gives every bot one ongoing "Bot Chat". Hermes' ACP server
 * cannot load sessions created outside ACP, so MonoCode keeps its own: one
 * ongoing chat per bot per project, plus any extra chats started from the
 * bot's menu. A chat's bot never changes, so the mapping is by session id.
 */
const KEY = "monocode.hermesBotChats.v1";

type Stored = {
  /** `${projectKey}\0${profile}` → the bot's ongoing chat in that project. */
  ongoing: Record<string, string>;
  /** Session id → profile, for every bot chat (ongoing or extra). */
  profiles: Record<string, string>;
};

const listeners = new Set<() => void>();
let version = 0;

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const value = parsed as Partial<Stored>;
      return {
        ongoing: stringRecord(value.ongoing),
        profiles: stringRecord(value.profiles),
      };
    }
  } catch {
    // corrupt or unavailable storage: start empty
  }
  return { ongoing: {}, profiles: {} };
}

function write(next: Stored): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // private mode / quota
  }
  version += 1;
  for (const listener of listeners) listener();
}

function stringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

function ongoingKey(project: string, profile: string): string {
  return `${pathKey(project)}\0${profile}`;
}

export function subscribeHermesBotChats(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getHermesBotChatsSnapshot(): number {
  return version;
}

/** The bot's ongoing chat in this project, if one was started. */
export function ongoingBotChat(
  project: string,
  profile: string,
): string | undefined {
  return read().ongoing[ongoingKey(project, profile)];
}

/** The bot a chat was started from, or undefined for an ordinary chat. */
export function botForSession(sessionId: string): string | undefined {
  return read().profiles[sessionId];
}

/** Record a bot chat; `ongoing` makes it the bot's chat for this project. */
export function rememberBotChat(
  project: string,
  profile: string,
  sessionId: string,
  ongoing: boolean,
): void {
  const stored = read();
  write({
    ongoing: ongoing
      ? { ...stored.ongoing, [ongoingKey(project, profile)]: sessionId }
      : stored.ongoing,
    profiles: { ...stored.profiles, [sessionId]: profile },
  });
}

/** Drop a chat that no longer exists (deleted, or failed to reopen). */
export function forgetBotChat(sessionId: string): void {
  const stored = read();
  if (
    !(sessionId in stored.profiles) &&
    !Object.values(stored.ongoing).includes(sessionId)
  ) {
    return;
  }
  const { [sessionId]: _removed, ...profiles } = stored.profiles;
  write({
    ongoing: Object.fromEntries(
      Object.entries(stored.ongoing).filter(([, id]) => id !== sessionId),
    ),
    profiles,
  });
}
