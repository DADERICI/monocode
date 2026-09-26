import { useEffect, useState, useSyncExternalStore } from "react";
import {
  FileScript,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Settings,
} from "../../../shared/ui/icons";
import { readTextFile, writeTextFile } from "../../../platform/tauri/fs";
import type { OpenFileFn } from "../../search/model/search";
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
import {
  TabGroupMenu,
  type TabGroupMenuExtraItem,
} from "../../workspace/ui/TabGroupMenu";

export type HermesBotsProps = {
  /** Profile of the active Hermes chat; `default` when none is set. */
  activeProfile: string;
  /** Start a new Hermes chat in the current project, run as this profile. */
  onStartChat: (profile: string) => void;
  /** Open a file in MonoCode's editor; used to edit a bot's SOUL.md or config. */
  onOpenFile: OpenFileFn;
};

/**
 * Appearance overrides (name, colour, mascot) live in the same store as
 * projects, under a key that can never collide with a project path.
 */
export function hermesBotAppearanceKey(profile: string): string {
  return `hermes-bot:${profile}`;
}

/** Starter persona for a bot that has no SOUL.md yet. */
export function starterSoul(profile: string): string {
  return [
    "# Identity",
    `You are ${profile}, a Hermes bot.`,
    "",
    "# Style",
    "",
    "# Avoid",
    "",
    "# Defaults",
    "",
  ].join("\n");
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

const BOT_ACTIONS: TabGroupMenuExtraItem[] = [
  { id: "chat", label: "New chat", icon: Plus },
  {
    id: "soul",
    label: "Edit soul",
    description: "SOUL.md: identity, style, what to avoid",
    icon: FileScript,
  },
  {
    id: "config",
    label: "Edit settings",
    description: "config.yaml: model, tools, memory",
    icon: Settings,
  },
];

/**
 * A sidebar column of Hermes profiles ("bots"), shown beside the workspace
 * sidebar only while the active chat runs on Hermes. Rows look like projects:
 * a pixel mascot and a name. Each bot's menu starts a chat, opens its SOUL.md
 * or config.yaml in the editor, and restyles it like a project.
 */
export function HermesBotsSidebar({
  activeProfile,
  onStartChat,
  onOpenFile,
}: HermesBotsProps) {
  useSyncExternalStore(
    subscribeHermesProfiles,
    getHermesProfilesSnapshot,
    getHermesProfilesSnapshot,
  );
  const profiles = hermesProfiles();
  const [appearance, setAppearance] = useState(loadAppearance);
  const [menu, setMenu] = useState<{
    profile: HermesProfile;
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

  const openSoul = async (profile: HermesProfile) => {
    const path = `${profile.home}/SOUL.md`;
    try {
      await readTextFile(path);
    } catch {
      await writeTextFile(path, starterSoul(profile.name));
    }
    onOpenFile(path, undefined, { exact: true, pin: true });
  };

  return (
    <aside
      aria-label="Hermes bots"
      className="body-glass relative flex h-full w-52 min-h-0 shrink-0 flex-col border-r border-stroke"
    >
      <div
        className="flex h-10 shrink-0 select-none items-center gap-1 border-b border-stroke pl-3 pr-1.5"
        data-tauri-drag-region="deep"
      >
        <span className="min-w-0 flex-1 truncate text-sm font-medium leading-tight">
          Bots
        </span>
        <button
          type="button"
          title="Refresh bots (create one with `hermes profile create <name>`)"
          aria-label="Refresh bots"
          data-tauri-drag-region="false"
          onClick={() => void refreshHermesProfiles()}
          className="grid size-6 shrink-0 place-items-center rounded-md text-content/50 hover:bg-content/8 hover:text-content"
        >
          <RefreshCw className="size-3.5" strokeWidth={1.75} />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto p-2">
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
              onOpenMenu={(x, y) => setMenu({ profile, x, y })}
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
          onAction={(id) => {
            if (id === "chat") onStartChat(menu.profile.name);
            else if (id === "soul") void openSoul(menu.profile);
            else if (id === "config") {
              onOpenFile(`${menu.profile.home}/config.yaml`, undefined, {
                exact: true,
                pin: true,
              });
            }
          }}
        />
      ) : null}
    </aside>
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
      className={`group relative flex h-8 shrink-0 items-stretch rounded-md px-2 ${
        selected
          ? "bg-selection-strong text-content"
          : "opacity-65 hover:opacity-100"
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
        title="Bot options"
        aria-label={`${name} options`}
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
  onAction,
}: {
  profile: HermesProfile;
  x: number;
  y: number;
  appearance: Appearance;
  onClose: () => void;
  onAction: (id: string) => void;
}) {
  const key = hermesBotAppearanceKey(profile.name);
  return (
    <TabGroupMenu
      x={x}
      y={y}
      groupId={key}
      ariaLabel={`${profile.name} bot options`}
      label={resolveTabGroupLabel(key, appearance.labels, profile.name)}
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
      extraItems={BOT_ACTIONS}
      onExtraPick={onAction}
    />
  );
}
