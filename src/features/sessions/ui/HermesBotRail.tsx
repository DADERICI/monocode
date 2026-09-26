import { useEffect, useSyncExternalStore } from "react";
import {
  getHermesProfilesSnapshot,
  hermesProfiles,
  refreshHermesProfiles,
  subscribeHermesProfiles,
  type HermesProfile,
} from "../../../integrations/harness/providers/hermes/hermesProfiles";
import { HarnessIcon } from "./HarnessIcon";

type Props = {
  /** Profile of the active Hermes chat; `default` when none is set. */
  activeProfile: string;
  /** Start a new Hermes chat in the current project, run as this profile. */
  onStartChat: (profile: string) => void;
};

/**
 * A slim rail of Hermes profiles ("bots"), shown beside the sidebar only while
 * the active chat runs on Hermes. Each bot keeps its own SOUL.md, memory,
 * skills, and model; picking one opens a chat that runs `hermes -p <bot> acp`.
 */
export function HermesBotRail({ activeProfile, onStartChat }: Props) {
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
    <nav
      aria-label="Hermes bots"
      className="sidebar-glass flex h-full w-12 shrink-0 flex-col items-center gap-1.5 border-r border-content/10 py-2"
    >
      <span
        className="grid size-8 place-items-center text-content/45"
        title="Hermes bots"
      >
        <HarnessIcon harness="hermes" className="size-4" />
      </span>
      <div className="h-px w-6 bg-content/10" />
      {profiles.map((profile) => (
        <BotButton
          key={profile.name}
          profile={profile}
          active={profile.name === activeProfile}
          onClick={() => onStartChat(profile.name)}
        />
      ))}
      <button
        type="button"
        title="Refresh bots (add one with `hermes profile create <name>`)"
        aria-label="Refresh bots"
        onClick={() => void refreshHermesProfiles()}
        className="mt-auto grid size-8 place-items-center rounded-md text-[15px] text-content/40 hover:bg-content/5 hover:text-content active:scale-[0.97]"
      >
        ↻
      </button>
    </nav>
  );
}

function BotButton({
  profile,
  active,
  onClick,
}: {
  profile: HermesProfile;
  active: boolean;
  onClick: () => void;
}) {
  const label = botTooltip(profile);
  return (
    <button
      type="button"
      title={label}
      aria-label={`New chat with ${profile.name}`}
      aria-current={active ? "true" : undefined}
      onClick={onClick}
      className={`grid size-8 shrink-0 place-items-center rounded-full text-[12px] font-semibold text-white outline-none active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-accent/60 ${
        active
          ? "ring-2 ring-content/70 ring-offset-1 ring-offset-transparent"
          : "opacity-80 hover:opacity-100"
      }`}
      style={{ backgroundColor: botColor(profile.name) }}
    >
      {botInitial(profile.name)}
    </button>
  );
}

/** One or two letters: `builder` → B, `feature-tester` → FT. */
export function botInitial(name: string): string {
  const parts = name.split(/[-_]+/).filter(Boolean);
  const letters =
    parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0]?.[0] ?? "?");
  return letters.toUpperCase();
}

/** Stable hue per name, so a bot keeps its colour across restarts. */
export function botColor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `hsl(${hash % 360} 45% 42%)`;
}

function botTooltip(profile: HermesProfile): string {
  return [
    profile.isDefault ? `${profile.name} (default profile)` : profile.name,
    profile.model,
    profile.summary,
  ]
    .filter(Boolean)
    .join("\n");
}
