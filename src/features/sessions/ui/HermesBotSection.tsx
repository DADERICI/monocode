import { useEffect, useState, useSyncExternalStore } from "react";
import { MoreHorizontal, RefreshCw } from "../../../shared/ui/icons";
import {
  getHermesProfilesSnapshot,
  hermesProfiles,
  refreshHermesProfiles,
  subscribeHermesProfiles,
  type HermesProfile,
} from "../../../integrations/harness/providers/hermes/hermesProfiles";
import { subscribeProjectPathsChanged } from "../../projects/model/recents";
import { ProjectMascot } from "../../projects/ui/ProjectMascot";
import {
  loadTabGroupColors,
  loadTabGroupCustomColors,
  loadTabGroupLabels,
  loadTabGroupMascots,
  resolveTabGroupColor,
  resolveTabGroupColorIndex,
  resolveTabGroupCustomColor,
  resolveTabGroupLabel,
  resolveTabGroupMascot,
  saveTabGroupColor,
  saveTabGroupCustomColor,
  saveTabGroupLabel,
  saveTabGroupMascot,
} from "../../workspace/model/tabGroups";
import { TabGroupMenu } from "../../workspace/ui/TabGroupMenu";

export type HermesBotsProps = {
  /** Profile of the active Hermes chat; `default` when none is set. */
  activeProfile: string;
  /** Start a new Hermes chat in the current project, run as this profile. */
  onStartChat: (profile: string) => void;
};

/**
 * Appearance overrides (name, colour, mascot) live in the same store as
 * projects, under a key that can never collide with a project path.
 */
export function hermesBotAppearanceKey(profile: string): string {
  return `hermes-bot:${profile}`;
}

type Appearance = {
  labels: Record<string, string>;
  colors: Record<string, number>;
  customColors: Record<string, string>;
  mascots: Record<string, string>;
};

function loadAppearance(): Appearance {
  return {
    labels: loadTabGroupLabels(),
    colors: loadTabGroupColors(),
    customColors: loadTabGroupCustomColors(),
    mascots: loadTabGroupMascots(),
  };
}

/**
 * Hermes profiles ("bots") listed like projects: a pixel mascot and a name,
 * each restyled from its "…" menu. Shown only while the active chat runs on
 * Hermes; picking a bot opens a chat that runs `hermes -p <bot> acp`.
 */
export function HermesBotSection({ activeProfile, onStartChat }: HermesBotsProps) {
  useSyncExternalStore(
    subscribeHermesProfiles,
    getHermesProfilesSnapshot,
    getHermesProfilesSnapshot,
  );
  const profiles = hermesProfiles();
  const [appearance, setAppearance] = useState(loadAppearance);
  const [menu, setMenu] = useState<{
    profile: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    void refreshHermesProfiles();
  }, []);
  useEffect(
    () => subscribeProjectPathsChanged(() => setAppearance(loadAppearance())),
    [],
  );

  return (
    <section aria-label="Hermes bots" className="flex flex-col">
      <div className="flex items-center gap-1 px-3 pb-1.5 pt-3">
        <span className="min-w-0 flex-1 truncate px-1 text-xs text-content/50">
          Bots
        </span>
        <button
          type="button"
          title="Refresh bots (create one with `hermes profile create <name>`)"
          aria-label="Refresh bots"
          onClick={() => void refreshHermesProfiles()}
          className="grid size-5 shrink-0 place-items-center rounded-md text-content/50 hover:bg-content/8 hover:text-content"
        >
          <RefreshCw className="size-3.5" strokeWidth={1.75} />
        </button>
      </div>
      <div className="flex flex-col gap-px px-2">
        {profiles.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-content/40">Loading bots…</p>
        ) : (
          profiles.map((profile) => (
            <BotCard
              key={profile.name}
              profile={profile}
              appearance={appearance}
              selected={profile.name === activeProfile}
              onSelect={() => onStartChat(profile.name)}
              onOpenMenu={(x, y) => setMenu({ profile: profile.name, x, y })}
            />
          ))
        )}
      </div>
      {menu ? (
        <BotMenu
          profile={menu.profile}
          x={menu.x}
          y={menu.y}
          appearance={appearance}
          onClose={() => setMenu(null)}
        />
      ) : null}
    </section>
  );
}

function BotCard({
  profile,
  appearance,
  selected,
  onSelect,
  onOpenMenu,
}: {
  profile: HermesProfile;
  appearance: Appearance;
  selected: boolean;
  onSelect: () => void;
  onOpenMenu: (x: number, y: number) => void;
}) {
  const key = hermesBotAppearanceKey(profile.name);
  const name = resolveTabGroupLabel(key, appearance.labels, profile.name);
  const color = resolveTabGroupColor(
    key,
    appearance.colors,
    appearance.customColors,
    key,
  );
  const title = [
    name === profile.name ? profile.name : `${name} (${profile.name})`,
    profile.isDefault ? "Default Hermes profile" : undefined,
    profile.model,
    profile.summary,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div
      data-selected={selected || undefined}
      className={`group relative flex h-8 items-stretch rounded-md px-2 ${
        selected ? "bg-selection-strong text-content" : "opacity-65 hover:opacity-100"
      }`}
    >
      <button
        type="button"
        title={title}
        aria-label={`New chat with ${name}`}
        aria-current={selected ? "true" : undefined}
        onClick={onSelect}
        onContextMenu={(event) => {
          event.preventDefault();
          onOpenMenu(event.clientX, event.clientY);
        }}
        className="flex min-w-0 flex-1 cursor-default items-center gap-2 text-left outline-none group-hover:pr-6 focus-visible:ring-1 focus-visible:ring-accent/50"
      >
        <span className="grid size-4 shrink-0 place-items-center">
          <ProjectMascot
            project={key}
            color={color}
            name={resolveTabGroupMascot(key, appearance.mascots)}
            className="size-3"
          />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium leading-tight">
          {name}
        </span>
      </button>
      <button
        type="button"
        title="Bot appearance"
        aria-label="Bot appearance"
        aria-haspopup="menu"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          onOpenMenu(
            event.detail === 0 ? rect.left : event.clientX,
            event.detail === 0 ? rect.bottom : event.clientY,
          );
        }}
        className="absolute right-1 top-1/2 hidden size-6 -translate-y-1/2 place-items-center rounded-md text-content/55 hover:bg-content/8 hover:text-content group-hover:grid group-has-[:focus-visible]:grid"
      >
        <MoreHorizontal className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}

function BotMenu({
  profile,
  x,
  y,
  appearance,
  onClose,
}: {
  profile: string;
  x: number;
  y: number;
  appearance: Appearance;
  onClose: () => void;
}) {
  const key = hermesBotAppearanceKey(profile);
  return (
    <TabGroupMenu
      x={x}
      y={y}
      groupId={key}
      ariaLabel={`${profile} bot appearance`}
      label={resolveTabGroupLabel(key, appearance.labels, profile)}
      colorIndex={resolveTabGroupColorIndex(
        key,
        appearance.colors,
        appearance.customColors,
      )}
      customColor={resolveTabGroupCustomColor(key, appearance.customColors)}
      currentColor={resolveTabGroupColor(
        key,
        appearance.colors,
        appearance.customColors,
        key,
      )}
      logoPath={null}
      mascotName={resolveTabGroupMascot(key, appearance.mascots)}
      mascotProject={key}
      onRename={saveTabGroupLabel}
      onColorChange={saveTabGroupColor}
      onCustomColorChange={saveTabGroupCustomColor}
      onMascotChange={saveTabGroupMascot}
      onLogoChange={() => {}}
      onPick={() => {}}
      onClose={onClose}
      showActions={false}
    />
  );
}
