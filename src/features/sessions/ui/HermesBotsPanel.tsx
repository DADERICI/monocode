import { useEffect, useSyncExternalStore } from "react";
import {
  getHarnessAvailabilitySnapshot,
  isHarnessAvailable,
  subscribeHarnessAvailability,
} from "../../../integrations/harness/core/availabilityState";
import {
  getHermesProfilesSnapshot,
  hermesProfiles,
  refreshHermesProfiles,
  subscribeHermesProfiles,
  type HermesProfile,
} from "../../../integrations/harness/providers/hermes/hermesProfiles";
import { HarnessIcon } from "./HarnessIcon";

/** True once the availability probe has found the Hermes Agent CLI. */
export function useHermesBotsAvailable(): boolean {
  useSyncExternalStore(
    subscribeHarnessAvailability,
    getHarnessAvailabilitySnapshot,
    getHarnessAvailabilitySnapshot,
  );
  return isHarnessAvailable("hermes");
}

type Props = {
  /** Start a new Hermes chat in the current project, run as this profile. */
  onStartChat: (profile: string) => void;
};

/**
 * Hermes profiles as a roster of bots, like Hermes Desktop's Bots pane. Each
 * profile keeps its own SOUL.md, memory, skills, and model; picking one opens
 * a fresh chat that runs `hermes -p <profile> acp`.
 */
export function HermesBotsPanel({ onStartChat }: Props) {
  useSyncExternalStore(
    subscribeHermesProfiles,
    getHermesProfilesSnapshot,
    getHermesProfilesSnapshot,
  );
  const profiles = hermesProfiles();

  useEffect(() => {
    void refreshHermesProfiles();
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span className="text-[11px] font-medium tracking-wide text-content/50 uppercase">
          Hermes bots
        </span>
        <button
          type="button"
          onClick={() => void refreshHermesProfiles()}
          className="rounded px-1.5 py-0.5 text-[11px] text-content/50 hover:bg-content/5 hover:text-content"
        >
          Refresh
        </button>
      </div>
      {profiles.length === 0 ? (
        <p className="px-3 py-2 text-[12px] text-content/50">Loading bots…</p>
      ) : (
        <ul className="flex flex-col gap-0.5 p-1.5" aria-label="Hermes bots">
          {profiles.map((profile) => (
            <BotRow
              key={profile.name}
              profile={profile}
              onStart={() => onStartChat(profile.name)}
            />
          ))}
        </ul>
      )}
      <p className="mt-auto px-3 py-3 text-[11px] leading-relaxed text-content/40">
        Add a bot with{" "}
        <code className="rounded bg-content/5 px-1">
          hermes profile create &lt;name&gt;
        </code>
        , then Refresh.
      </p>
    </div>
  );
}

function BotRow({
  profile,
  onStart,
}: {
  profile: HermesProfile;
  onStart: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onStart}
        title={`New chat with ${profile.name}`}
        className="w-full rounded-md border border-transparent px-2.5 py-2 text-left text-content/80 outline-none hover:bg-content/5 hover:text-content focus-visible:ring-1 focus-visible:ring-accent/50"
      >
        <span className="flex items-center gap-2">
          <span className="flex min-w-0 flex-1 items-center gap-1.5">
            <HarnessIcon harness="hermes" className="size-3.5 shrink-0" />
            <span className="min-w-0 truncate text-[13px] font-semibold text-content">
              {profile.name}
            </span>
            {profile.isDefault ? (
              <span className="shrink-0 rounded bg-content/5 px-1 text-[10px] text-content/50">
                default
              </span>
            ) : null}
          </span>
          {profile.model ? (
            <span className="min-w-0 max-w-[45%] truncate text-[11px] text-content/50">
              {profile.model}
            </span>
          ) : null}
        </span>
        {profile.summary ? (
          <span className="mt-1 line-clamp-2 block text-[12px] leading-snug text-content/55">
            {profile.summary}
          </span>
        ) : null}
      </button>
    </li>
  );
}
