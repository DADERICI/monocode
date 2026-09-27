import { findModel, resolveModel } from "./models";
import type { HarnessId } from "./session";
import { hermesProfiles } from "../../../integrations/harness/providers/hermes/hermesProfiles";

const HERMES_CONFIGURED_MODEL_ID = "hermes:default";

/**
 * The model name to show for a chat. A Hermes chat on "Configured model" runs
 * whatever its bot's config.yaml selects, so it names that model instead of
 * the placeholder; every other chat shows its catalog name.
 */
export function displayModelName(
  harness: HarnessId,
  model: string | undefined,
  settings?: Record<string, string>,
): string {
  const resolved = resolveModel(harness, model);
  if (harness === "hermes" && resolved.id === HERMES_CONFIGURED_MODEL_ID) {
    return hermesBotModelName(settings?.profile) ?? resolved.name;
  }
  return resolved.name;
}

/**
 * The model a Hermes bot (profile) is configured with, as a display name:
 * the catalog's name when Hermes listed it, else the bare model id.
 */
export function hermesBotModelName(profile?: string): string | undefined {
  const name = profile?.trim() || "default";
  const configured = hermesProfiles().find((p) => p.name === name)?.model;
  if (!configured) return undefined;
  return configuredModelLabel(configured);
}

/**
 * `zai/glm-5.3-flash` → the catalog name for `hermes:zai:glm-5.3-flash` when
 * known, otherwise `glm-5.3-flash`.
 */
export function configuredModelLabel(configured: string): string {
  const slash = configured.indexOf("/");
  const provider = slash > 0 ? configured.slice(0, slash) : "";
  const tail = slash > 0 ? configured.slice(slash + 1) : configured;
  const listed = provider ? findModel(`hermes:${provider}:${tail}`) : undefined;
  return listed?.name && listed.name !== tail ? listed.name : tail;
}
