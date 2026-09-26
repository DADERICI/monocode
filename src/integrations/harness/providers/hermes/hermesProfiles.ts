import { homeDir, listDir, readTextFile } from "../../../../platform/tauri/fs";
import {
  hermesConfiguredModel,
  hermesProfileName,
  hermesSoulSummary,
  isHermesProfileDir,
} from "./hermesProtocol";

/** A Hermes profile ("bot"): its own SOUL.md, memory, skills, and model. */
export type HermesProfile = {
  /** `default`, or the name passed to `hermes -p`. */
  name: string;
  isDefault: boolean;
  /** Model from the profile's config.yaml, e.g. `zai/glm-5.3-flash`. */
  model?: string;
  /** First line of the profile's SOUL.md. */
  summary?: string;
};

const listeners = new Set<() => void>();
let profiles: HermesProfile[] = [];
let version = 0;
let inflight: Promise<HermesProfile[]> | null = null;

export function subscribeHermesProfiles(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getHermesProfilesSnapshot(): number {
  return version;
}

/** Last discovered profiles; the default profile first once discovery ran. */
export function hermesProfiles(): HermesProfile[] {
  return profiles;
}

/** Named profiles only, as passed to `hermes -p`. */
export function namedHermesProfiles(): string[] {
  return profiles.filter((profile) => !profile.isDefault).map((p) => p.name);
}

/** Re-read ~/.hermes and its profiles/ directory. Concurrent calls share one scan. */
export function refreshHermesProfiles(): Promise<HermesProfile[]> {
  if (inflight) return inflight;
  inflight = discoverHermesProfiles()
    .then((next) => {
      if (!sameProfiles(profiles, next)) {
        profiles = next;
        version += 1;
        for (const listener of listeners) listener();
      }
      return next;
    })
    .catch((error: unknown) => {
      console.debug("[monocode] hermes profiles", error);
      return profiles;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

async function discoverHermesProfiles(): Promise<HermesProfile[]> {
  const root = `${await homeDir()}/.hermes`;
  const named = await namedProfileDirs(`${root}/profiles`);
  const all = await Promise.all([
    readProfile("default", root, true),
    ...named.map((name) => readProfile(name, `${root}/profiles/${name}`, false)),
  ]);
  return all;
}

/** Directories under profiles/ that Hermes itself would list as profiles. */
async function namedProfileDirs(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await listDir(dir);
  } catch {
    // No profiles directory simply means the default profile only.
    return [];
  }
  const names = await Promise.all(
    entries
      .filter((entry) => entry.isDir && hermesProfileName(entry.name))
      .map(async (entry) => {
        try {
          const files = await listDir(entry.path);
          return isHermesProfileDir(files.map((file) => file.name))
            ? entry.name
            : undefined;
        } catch {
          return undefined;
        }
      }),
  );
  return names.filter((name): name is string => Boolean(name)).sort();
}

async function readProfile(
  name: string,
  home: string,
  isDefault: boolean,
): Promise<HermesProfile> {
  const [config, soul] = await Promise.all([
    readOptional(`${home}/config.yaml`),
    readOptional(`${home}/SOUL.md`),
  ]);
  return {
    name,
    isDefault,
    model: config ? hermesConfiguredModel(config) : undefined,
    summary: soul ? hermesSoulSummary(soul) : undefined,
  };
}

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readTextFile(path);
  } catch {
    return undefined;
  }
}

function sameProfiles(a: HermesProfile[], b: HermesProfile[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
