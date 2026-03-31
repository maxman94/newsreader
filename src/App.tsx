import { startTransition, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { SignInButton, SignOutButton, useAuth } from "@clerk/react";
import {
  ArrowDown,
  ArrowUp,
  BookCheck,
  BookOpenText,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Check,
  Disc3,
  LoaderCircle,
  Newspaper,
  Palette,
  Play,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasClerkConfig } from "@/lib/clerk";
import { requestJson } from "@/lib/http";
import {
  AP_TOPIC_OPTIONS,
  createApPlugin,
  createAlbumPlugin,
  createFeedDraft,
  createHeadlineSourceDraft,
  createFunnyPagesPlugin,
  createFunnyPagesSourceDraft,
  createMangaSourceDraft,
  createMangaPlugin,
  createReadComicsPlugin,
  createReadComicsSourceDraft,
  createRssPlugin,
  createReutersPlugin,
} from "@/lib/plugin-factory";
import { FUNNY_PAGES_GROUPS } from "@/data/funny-pages";
import { RSS_PRESET_GROUPS } from "@/data/rss-feeds";
import type {
  AISettings,
  AISettingsResponse,
  AlbumSelectionStrategy,
  AppBootstrapResponse,
  AuthSession,
  ColorScheme,
  CompletionRecord,
  ConfigResponse,
  DigestPage,
  DigestResponse,
  FeedSelectionStrategy,
  FontScale,
  HabitsResponse,
  PluginInstance,
  PluginType,
  PreferencesResponse,
  StoredDigest,
  ThemeMode,
  TypographyPreset,
  UserConfig,
  UserPreferences,
} from "@/types/app";

const THEME_OPTIONS: ThemeMode[] = ["light", "dark"];
const COLOR_SCHEMES: ColorScheme[] = [
  "default",
  "sepia",
  "nord",
  "catppuccin",
  "everforest",
  "solarized",
  "gruvbox",
  "rose-pine",
];
const TYPOGRAPHY_PRESETS: TypographyPreset[] = [
  "editorial",
  "modern",
  "bookish",
  "typewritten",
];
const FONT_SCALES: FontScale[] = ["sm", "md", "lg"];
const STRATEGIES: FeedSelectionStrategy[] = ["best-of-day", "newest", "catch-up"];
const ALBUM_STRATEGIES: AlbumSelectionStrategy[] = ["library-random", "recently-added"];
const MORNING_MODIFIERS = [
  "finite",
  "bounded",
  "measured",
  "deliberate",
  "contained",
  "edited",
];
const PLUGIN_DEFINITIONS: Record<
  PluginType,
  {
    Icon: LucideIcon;
    addLabel: string;
    settingsDescription: string;
    create: (index: number) => PluginInstance;
  }
> = {
  "ap-headlines": {
    Icon: Newspaper,
    addLabel: "Add headlines",
    settingsDescription:
      "A brisk front page, arranged by the sections you want to keep close.",
    create: createApPlugin,
  },
  "reuters-headlines": {
    Icon: Newspaper,
    addLabel: "Add Reuters",
    settingsDescription:
      "A second front page in a Reuters voice, for a cleaner wire-service read.",
    create: createReutersPlugin,
  },
  "rss-reader": {
    Icon: BookOpenText,
    addLabel: "Add reader",
    settingsDescription:
      "A deeper page for essays, columns, and pieces worth keeping company with.",
    create: createRssPlugin,
  },
  "album-of-the-day": {
    Icon: Disc3,
    addLabel: "Add album",
    settingsDescription: "One record for the day, with its tracklist and a place to press play.",
    create: createAlbumPlugin,
  },
  "mangadex-reader": {
    Icon: BookOpenText,
    addLabel: "Add manga",
    settingsDescription:
      "An ordered manga shelf: one volume at a time, then the remaining chapters.",
    create: createMangaPlugin,
  },
  "readcomiconline-reader": {
    Icon: BookOpenText,
    addLabel: "Add comics",
    settingsDescription:
      "An ordered comics shelf, moving chapter by chapter through the series you choose.",
    create: createReadComicsPlugin,
  },
  "funny-pages": {
    Icon: Sparkles,
    addLabel: "Add funny pages",
    settingsDescription: "A small stack of strips, one from each page you keep in the rotation.",
    create: createFunnyPagesPlugin,
  },
};
const PLUGIN_ADD_ORDER: PluginType[] = [
  "ap-headlines",
  "reuters-headlines",
  "rss-reader",
  "funny-pages",
  "album-of-the-day",
  "mangadex-reader",
  "readcomiconline-reader",
];
const TYPOGRAPHY_PREVIEW_STYLES: Record<
  TypographyPreset,
  {
    label: string;
    blurb: string;
    ui: string;
    reading: string;
  }
> = {
  editorial: {
    label: "Editorial",
    blurb: "Measured, graceful, and a touch formal.",
    ui: '"Avenir Next", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
    reading: '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif',
  },
  modern: {
    label: "Modern",
    blurb: "Sharper edges, cleaner rhythm, lighter on the page.",
    ui: '"IBM Plex Sans", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
    reading: '"Source Serif 4", Georgia, "Times New Roman", serif',
  },
  bookish: {
    label: "Bookish",
    blurb: "Softer, older, and a little more novel-like.",
    ui: '"Gill Sans", "Avenir Next", ui-sans-serif, system-ui, sans-serif',
    reading: '"Baskerville", "Libre Baskerville", "Book Antiqua", Georgia, serif',
  },
  typewritten: {
    label: "Typewritten",
    blurb: "Monospaced, tactile, and a little newsroom-at-midnight.",
    ui: '"IBM Plex Mono", "Courier Prime", "Courier New", ui-monospace, monospace',
    reading: '"Courier Prime", "IBM Plex Mono", "Courier New", ui-monospace, monospace',
  },
};
const COLOR_SCHEME_PREVIEWS: Record<
  ColorScheme,
  {
    label: string;
    blurb: string;
    light: { background: string; foreground: string; border: string; accent: string; muted: string };
    dark: { background: string; foreground: string; border: string; accent: string; muted: string };
  }
> = {
  default: {
    label: "Default",
    blurb: "Warm paper, cool green, and an even contrast.",
    light: {
      background: "#f4eee4",
      foreground: "#1d1a16",
      border: "rgba(74, 58, 39, 0.16)",
      accent: "#1f5c56",
      muted: "#6b5e4f",
    },
    dark: {
      background: "#121312",
      foreground: "#f2ebdf",
      border: "rgba(221, 213, 199, 0.12)",
      accent: "#8cc6b7",
      muted: "#a69c8e",
    },
  },
  sepia: {
    label: "Sepia",
    blurb: "A browner page with a little more old-library warmth.",
    light: {
      background: "#f0e4d1",
      foreground: "#221910",
      border: "rgba(96, 74, 48, 0.18)",
      accent: "#815b33",
      muted: "#715a43",
    },
    dark: {
      background: "#17120e",
      foreground: "#f2e2cf",
      border: "rgba(233, 209, 179, 0.12)",
      accent: "#d0a979",
      muted: "#b39d84",
    },
  },
  nord: {
    label: "Nord",
    blurb: "Cooler air, clearer edges, and a quieter blue accent.",
    light: {
      background: "#e7edf4",
      foreground: "#1d2630",
      border: "rgba(57, 78, 99, 0.16)",
      accent: "#3b6f91",
      muted: "#61717f",
    },
    dark: {
      background: "#12171b",
      foreground: "#e9eef4",
      border: "rgba(188, 203, 216, 0.12)",
      accent: "#88b2cf",
      muted: "#9caebb",
    },
  },
  catppuccin: {
    label: "Catppuccin",
    blurb: "Softer rose tones with a more upholstered feel.",
    light: {
      background: "#f6edf4",
      foreground: "#2c2732",
      border: "rgba(94, 76, 97, 0.15)",
      accent: "#8f5b87",
      muted: "#776a7b",
    },
    dark: {
      background: "#16131a",
      foreground: "#f1e9f1",
      border: "rgba(224, 205, 228, 0.12)",
      accent: "#d0a3ca",
      muted: "#aa9db0",
    },
  },
  everforest: {
    label: "Everforest",
    blurb: "Greener, calmer, and a little more wooded.",
    light: {
      background: "#eef1e5",
      foreground: "#20261d",
      border: "rgba(73, 90, 56, 0.16)",
      accent: "#5d7348",
      muted: "#637055",
    },
    dark: {
      background: "#121612",
      foreground: "#edf0e7",
      border: "rgba(214, 228, 200, 0.12)",
      accent: "#a6c08b",
      muted: "#9fb096",
    },
  },
  solarized: {
    label: "Solarized",
    blurb: "Amber light, sea-blue accents, and gentler contrast.",
    light: {
      background: "#fdf6e3",
      foreground: "#586e75",
      border: "rgba(88, 110, 117, 0.16)",
      accent: "#268bd2",
      muted: "#657b83",
    },
    dark: {
      background: "#002b36",
      foreground: "#93a1a1",
      border: "rgba(147, 161, 161, 0.12)",
      accent: "#2aa198",
      muted: "#839496",
    },
  },
  gruvbox: {
    label: "Gruvbox",
    blurb: "Burnt ochre, olive, and a snug low-light warmth.",
    light: {
      background: "#fbf1c7",
      foreground: "#3c3836",
      border: "rgba(60, 56, 54, 0.16)",
      accent: "#b57614",
      muted: "#665c54",
    },
    dark: {
      background: "#282828",
      foreground: "#ebdbb2",
      border: "rgba(235, 219, 178, 0.12)",
      accent: "#d79921",
      muted: "#bdae93",
    },
  },
  "rose-pine": {
    label: "Rosé Pine",
    blurb: "Dusky mauve, pine green, and a softer evening palette.",
    light: {
      background: "#faf4ed",
      foreground: "#575279",
      border: "rgba(87, 82, 121, 0.16)",
      accent: "#286983",
      muted: "#797593",
    },
    dark: {
      background: "#191724",
      foreground: "#e0def4",
      border: "rgba(224, 222, 244, 0.12)",
      accent: "#9ccfd8",
      muted: "#908caa",
    },
  },
};
const MORNING_PURPOSES = [
  "meant to leave you informed and a little lighter.",
  "meant to sharpen the day without taking it over.",
  "meant to be finished before the world gets noisy.",
  "meant to offer shape, not churn.",
  "meant to steady the mind before the day begins in earnest.",
  "meant to keep company with your coffee and then let you go.",
];

type View = "today" | "archive" | "habits" | "settings";

type DigestApiResponse = DigestResponse & {
  archiveDates?: string[];
};

function logApp(event: string, details?: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    console.info("[newsreader]", event, details ?? {});
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function quoteIndexForDate(value: string) {
  return [...value].reduce((total, character) => total + character.charCodeAt(0), 0);
}

function morningLine(value: string) {
  const seed = quoteIndexForDate(value);
  const modifier = MORNING_MODIFIERS[seed % MORNING_MODIFIERS.length];
  const purpose = MORNING_PURPOSES[(seed * 3) % MORNING_PURPOSES.length];

  return `A ${modifier} morning edition, ${purpose}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatDurationMs(value?: number) {
  if (!value || value <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.round(value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function estimateWords(paragraphs: string[]) {
  return paragraphs.join(" ").trim().split(/\s+/).filter(Boolean).length;
}

function clonePreferences(preferences: UserPreferences) {
  return JSON.parse(JSON.stringify(preferences)) as UserPreferences;
}

function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function firstName(value?: string) {
  const candidate = value?.trim().split(/\s+/)[0];
  return candidate && candidate.length > 0 ? candidate : "there";
}

function completionStatus(completion: CompletionRecord | null, pluginInstanceId: string) {
  return completion?.plugins[pluginInstanceId]?.completed ?? false;
}

function funnyPagesSourceKey(source: { provider: string; slug?: string; url?: string }) {
  return source.provider === "latest-webcomic"
    ? `${source.provider}:${source.url ?? ""}`
    : `${source.provider}:${source.slug ?? ""}`;
}

function pluginTabIcon(pluginType: PluginType) {
  const { Icon } = PLUGIN_DEFINITIONS[pluginType];
  return <Icon className="size-4" />;
}

function pluginSettingsDescription(plugin: PluginInstance) {
  return PLUGIN_DEFINITIONS[plugin.type].settingsDescription;
}

function createUniquePlugin(
  plugins: PluginInstance[],
  pluginType: PluginType,
) {
  const definition = PLUGIN_DEFINITIONS[pluginType];
  let index = 1;

  while (index < 1000) {
    const candidate = definition.create(index);

    if (!plugins.some((plugin) => plugin.instanceId === candidate.instanceId)) {
      return candidate;
    }

    index += 1;
  }

  return definition.create(Date.now());
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
      <span className="mr-2 uppercase tracking-[0.2em] text-[0.65rem]">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function ColorSchemePreview({
  active,
  mode,
  onClick,
  scheme,
}: {
  active: boolean;
  mode: ThemeMode;
  onClick: () => void;
  scheme: ColorScheme;
}) {
  const preview = COLOR_SCHEME_PREVIEWS[scheme][mode];

  return (
    <button
      className="w-full rounded-[1.5rem] border p-4 text-left transition"
      style={{
        background: preview.background,
        color: preview.foreground,
        borderColor: active ? preview.accent : preview.border,
        boxShadow: active ? `0 0 0 1px ${preview.accent}` : undefined,
      }}
      type="button"
      onClick={onClick}
    >
      <div
        className="text-xs uppercase tracking-[0.22em]"
        style={{ color: preview.muted, fontFamily: "var(--font-ui)" }}
      >
        {COLOR_SCHEME_PREVIEWS[scheme].label}
      </div>
      <div
        className="mt-3 text-lg font-semibold"
        style={{ fontFamily: "var(--font-reading)" }}
      >
        {COLOR_SCHEME_PREVIEWS[scheme].label}
      </div>
      <p
        className="mt-2 text-sm leading-6"
        style={{ color: preview.muted, fontFamily: "var(--font-reading)" }}
      >
        {COLOR_SCHEME_PREVIEWS[scheme].blurb}
      </p>
      <div className="mt-4 h-1.5 w-14 rounded-full" style={{ background: preview.accent }} />
    </button>
  );
}

function TypographyPreview({
  active,
  onClick,
  preset,
}: {
  active: boolean;
  onClick: () => void;
  preset: TypographyPreset;
}) {
  const preview = TYPOGRAPHY_PREVIEW_STYLES[preset];

  return (
    <button
      className={
        active
          ? "w-full rounded-[1.5rem] border border-primary bg-background/90 p-4 text-left shadow-sm"
          : "w-full rounded-[1.5rem] border border-border bg-background/80 p-4 text-left transition hover:border-primary/60"
      }
      type="button"
      onClick={onClick}
    >
      <div
        className="text-xs uppercase tracking-[0.22em] text-muted-foreground"
        style={{ fontFamily: preview.ui }}
      >
        {preview.label}
      </div>
      <div
        className="mt-3 text-[1.35rem] font-semibold tracking-tight text-foreground"
        style={{ fontFamily: preview.reading }}
      >
        Morning edition
      </div>
      <p
        className="mt-2 text-sm leading-6 text-muted-foreground"
        style={{ fontFamily: preview.reading }}
      >
        {preview.blurb}
      </p>
    </button>
  );
}

function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={
        active
          ? "inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm"
          : "inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-2 text-sm font-medium text-muted-foreground"
      }
      type="button"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function CompletionButton({
  complete,
  disabled,
  onClick,
}: {
  complete: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={complete ? "secondary" : "default"}
      disabled={disabled}
      onClick={onClick}
    >
      {complete ? (
        <>
          <Check className="mr-2 size-4" />
          Finished
        </>
      ) : (
        <>
          <BookCheck className="mr-2 size-4" />
          Mark finished
        </>
      )}
    </Button>
  );
}

function APPageView({
  page,
  completionDisabled,
  complete,
  onToggleComplete,
}: {
  page: Extract<DigestPage, { pluginType: "ap-headlines" | "reuters-headlines" }>;
  completionDisabled: boolean;
  complete: boolean;
  onToggleComplete: () => void;
}) {
  const totalWords = estimateWords(page.stories.flatMap((story) => story.body));

  return (
    <article className="rounded-[2rem] border border-border/80 bg-background/90 p-5 shadow-[0_24px_70px_var(--shadow)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            <Newspaper className="size-3.5" />
            Headlines
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{page.title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatPill label="Minutes" value={`${page.estimatedMinutes}`} />
          <StatPill label="Words" value={totalWords.toLocaleString()} />
        </div>
      </div>

      <div className="mt-6">
        {page.stories.map((story, index) => {
          return (
            <div key={story.id} className={index === 0 ? "" : "border-t border-border/80 pt-6 mt-6"}>
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <span>{story.topicLabel}</span>
                {story.publishedAt ? <span>{new Date(story.publishedAt).toLocaleString()}</span> : null}
              </div>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
                {story.title}
              </h3>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
                {story.description}
              </p>
              <div className="mt-4 flex justify-end">
                <a
                  className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-primary hover:text-primary"
                  href={story.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  Read at source
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-end">
        <CompletionButton
          complete={complete}
          disabled={completionDisabled}
          onClick={onToggleComplete}
        />
      </div>
    </article>
  );
}

function RSSPageView({ page }: { page: Extract<DigestPage, { pluginType: "rss-reader" }> }) {
  const totalWords = estimateWords(page.items.flatMap((item) => item.body));

  return (
    <article className="rounded-[2rem] border border-border/80 bg-background/90 p-5 shadow-[0_24px_70px_var(--shadow)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            <BookOpenText className="size-3.5" />
            Reader
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{page.title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatPill label="Minutes" value={`${page.estimatedMinutes}`} />
          <StatPill label="Words" value={totalWords.toLocaleString()} />
        </div>
      </div>

      <div className="mt-6">
        {page.items.map((item, index) => {
          return (
            <div key={item.id} className={index === 0 ? "" : "border-t border-border/80 pt-6 mt-6"}>
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <span>{item.sourceLabel}</span>
                {item.publishedAt ? <span>{new Date(item.publishedAt).toLocaleDateString()}</span> : null}
              </div>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
                {item.title}
              </h3>
              <p className="mt-3 text-base leading-7 text-muted-foreground">{item.description}</p>
              <div className="mt-5 space-y-4 text-[1.04rem] leading-8 text-foreground [font-family:var(--font-reading)]">
                {item.body.map((paragraph, paragraphIndex) => (
                  <p key={`${item.id}-${paragraphIndex}`}>{paragraph}</p>
                ))}
              </div>
              <a
                className="mt-5 inline-flex items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
                href={item.url}
                rel="noreferrer"
                target="_blank"
              >
                Read at source
              </a>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function AlbumPageView({
  page,
  complete,
  completionDisabled,
  onLoadTrack,
  onToggleComplete,
}: {
  page: Extract<DigestPage, { pluginType: "album-of-the-day" }>;
  complete: boolean;
  completionDisabled: boolean;
  onLoadTrack: (pluginInstanceId: string, trackId: string) => Promise<string>;
  onToggleComplete: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(page.album.tracks[0]?.id ?? null);
  const [trackUrl, setTrackUrl] = useState<string | null>(null);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);

  useEffect(() => {
    setActiveTrackId(page.album.tracks[0]?.id ?? null);
    setPlayerError(null);
    setLoadingTrackId(null);
    setTrackUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }

      return null;
    });
  }, [page]);

  useEffect(() => {
    return () => {
      if (trackUrl) {
        URL.revokeObjectURL(trackUrl);
      }
    };
  }, [trackUrl]);

  const activeTrack =
    page.album.tracks.find((track) => track.id === activeTrackId) ?? page.album.tracks[0] ?? null;

  async function handlePlay(trackId: string) {
    setLoadingTrackId(trackId);
    setPlayerError(null);

    try {
      const nextUrl = await onLoadTrack(page.pluginInstanceId, trackId);

      setTrackUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }

        return nextUrl;
      });
      setActiveTrackId(trackId);
      requestAnimationFrame(() => {
        void audioRef.current?.play().catch(() => undefined);
      });
    } catch (error) {
      setPlayerError(error instanceof Error ? error.message : "This track could not be loaded.");
    } finally {
      setLoadingTrackId(null);
    }
  }

  return (
    <article className="rounded-[2rem] border border-border/80 bg-background/90 p-5 shadow-[0_24px_70px_var(--shadow)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            <Disc3 className="size-3.5" />
            Album
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{page.title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatPill label="Minutes" value={`${page.estimatedMinutes}`} />
          <StatPill label="Tracks" value={`${page.album.tracks.length}`} />
        </div>
      </div>

      <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{page.album.description}</p>

      <div className="mt-6 rounded-[1.5rem] border border-border bg-background/80 p-4">
        <div className="flex items-center gap-3">
            <Disc3 className="size-5 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">
                {activeTrack ? activeTrack.title : "Choose a track"}
              </div>
              <div className="text-xs text-muted-foreground">{page.album.artist}</div>
            </div>
        </div>

        <audio
          ref={audioRef}
          className="mt-4 w-full"
          controls
          preload="none"
          src={trackUrl ?? undefined}
        />

        {playerError ? (
          <p className="mt-3 text-sm text-destructive">{playerError}</p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Listen here, or let the full album carry you through the hour.
          </p>
        )}
      </div>

      <div className="mt-6">
        {page.album.tracks.map((track, index) => {
          const loading = loadingTrackId === track.id;
          const active = activeTrackId === track.id;

          return (
            <div
              key={track.id}
              className={
                index === 0
                  ? "flex items-center gap-3"
                  : "mt-6 flex items-center gap-3 border-t border-border/80 pt-6"
              }
            >
              <button
                className={
                  active
                    ? "inline-flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    : "inline-flex size-9 items-center justify-center rounded-full border border-border text-foreground"
                }
                type="button"
                onClick={() => void handlePlay(track.id)}
                disabled={loading}
              >
                {loading ? <LoaderCircle className="size-4 animate-spin" /> : <Play className="size-4" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">
                  {track.trackNumber ? `${track.trackNumber}. ` : ""}
                  {track.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {track.discNumber && track.discNumber > 1 ? `Disc ${track.discNumber} • ` : ""}
                  {formatDurationMs(track.durationMs)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-center">
        <CompletionButton
          complete={complete}
          disabled={completionDisabled}
          onClick={onToggleComplete}
        />
      </div>
    </article>
  );
}

type ReaderImagePage = {
  key: string;
  title: string;
  sublabel: string;
  imageUrl: string;
  imageIndex: number;
  pageCount: number;
  sourceUrl: string;
};

function PagedImageReaderSurface({
  badge,
  title,
  summary,
  estimatedMinutes,
  totalPages,
  pages,
  emptyLabel,
  openLabel,
  complete,
  completionDisabled,
  onToggleComplete,
}: {
  badge: string;
  title: string;
  summary: string;
  estimatedMinutes: number;
  totalPages: number;
  pages: ReaderImagePage[];
  emptyLabel: string;
  openLabel: string;
  complete: boolean;
  completionDisabled: boolean;
  onToggleComplete: () => void;
}) {
  const [readerIndex, setReaderIndex] = useState(0);
  const activeReaderPage = pages[readerIndex] ?? null;
  const progress = pages.length > 0 ? ((readerIndex + 1) / pages.length) * 100 : 0;

  useEffect(() => {
    setReaderIndex(0);
  }, [pages]);

  return (
    <article className="rounded-[2rem] border border-border/80 bg-background/90 p-5 shadow-[0_24px_70px_var(--shadow)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            <BookOpenText className="size-3.5" />
            {badge}
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatPill label="Minutes" value={`${estimatedMinutes}`} />
          <StatPill label="Pages" value={totalPages.toLocaleString()} />
        </div>
      </div>

      <div className="mt-6 border-t border-border/80 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {activeReaderPage?.sublabel ?? emptyLabel}
            </div>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
              {activeReaderPage?.title ?? title}
            </h3>
          </div>
          <a
            className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-primary hover:text-primary"
            href={activeReaderPage?.sourceUrl}
            rel="noreferrer"
            target="_blank"
          >
            {openLabel}
          </a>
        </div>

        <div className="mt-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Page {Math.min(readerIndex + 1, Math.max(pages.length, 1))} of {Math.max(pages.length, 1)}
            </span>
            <span>
              {activeReaderPage
                ? `${activeReaderPage.imageIndex + 1} / ${activeReaderPage.pageCount} in this section`
                : "No pages yet"}
            </span>
          </div>
        </div>

        {activeReaderPage ? (
          <img
            alt={`${activeReaderPage.title} page ${activeReaderPage.imageIndex + 1}`}
            className="mt-5 w-full rounded-[1rem] border border-border bg-background"
            loading="lazy"
            src={activeReaderPage.imageUrl}
          />
        ) : (
          <div className="mt-5 rounded-[1rem] border border-border bg-background/80 px-4 py-8 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            disabled={readerIndex === 0}
            onClick={() => setReaderIndex((current) => Math.max(0, current - 1))}
          >
            Previous page
          </Button>
          <Button
            disabled={pages.length === 0 || readerIndex >= pages.length - 1}
            onClick={() => setReaderIndex((current) => Math.min(pages.length - 1, current + 1))}
          >
            Next page
          </Button>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <CompletionButton
          complete={complete}
          disabled={completionDisabled}
          onClick={onToggleComplete}
        />
      </div>
    </article>
  );
}

function MangaPageView({
  page,
  complete,
  completionDisabled,
  onToggleComplete,
}: {
  page: Extract<DigestPage, { pluginType: "mangadex-reader" }>;
  complete: boolean;
  completionDisabled: boolean;
  onToggleComplete: () => void;
}) {
  const pages = useMemo(
    () =>
      page.manga.chapters.flatMap((chapter) =>
        chapter.imageUrls.map((imageUrl, imageIndex) => ({
          key: `${chapter.id}-${imageIndex}`,
          title: chapter.title,
          sublabel: chapter.volume
            ? `Vol. ${chapter.volume}${chapter.chapter ? ` • Chapter ${chapter.chapter}` : ""}`
            : chapter.chapter
              ? `Chapter ${chapter.chapter}`
              : "Non-volume chapter",
          imageUrl,
          imageIndex,
          pageCount: chapter.imageUrls.length,
          sourceUrl: `https://mangadex.org/chapter/${chapter.id}`,
        })),
      ),
    [page],
  );
  const totalPages = page.manga.chapters.reduce((total, chapter) => total + chapter.pages, 0);

  return (
    <PagedImageReaderSurface
      badge="Manga"
      title={page.title}
      summary={
        page.manga.chapters[0]?.volume
          ? `Volume ${page.manga.chapters[0].volume} from ${page.manga.title}.`
          : `The next unread chapter from ${page.manga.title}.`
      }
      estimatedMinutes={page.estimatedMinutes}
      totalPages={totalPages}
      pages={pages}
      emptyLabel="No pages are available for this selection."
      openLabel="Open on MangaDex"
      complete={complete}
      completionDisabled={completionDisabled}
      onToggleComplete={onToggleComplete}
    />
  );
}

function ComicsPageView({
  page,
  complete,
  completionDisabled,
  onToggleComplete,
}: {
  page: Extract<DigestPage, { pluginType: "readcomiconline-reader" }>;
  complete: boolean;
  completionDisabled: boolean;
  onToggleComplete: () => void;
}) {
  const pages = useMemo(
    () =>
      page.comic.chapters.flatMap((chapter) =>
        chapter.imageUrls.map((imageUrl, imageIndex) => ({
          key: `${chapter.id}-${imageIndex}`,
          title: chapter.title,
          sublabel: chapter.issue ? `Issue ${chapter.issue}` : "Chapter",
          imageUrl,
          imageIndex,
          pageCount: chapter.imageUrls.length,
          sourceUrl: chapter.sourceUrl,
        })),
      ),
    [page],
  );
  const totalPages = page.comic.chapters.reduce((total, chapter) => total + chapter.pages, 0);

  return (
    <PagedImageReaderSurface
      badge="Comics"
      title={page.title}
      summary={`${page.comic.chapters[0]?.title ?? "Today's chapter"} from ${page.comic.title}.`}
      estimatedMinutes={page.estimatedMinutes}
      totalPages={totalPages}
      pages={pages}
      emptyLabel="No pages are available for this chapter."
      openLabel="Read at source"
      complete={complete}
      completionDisabled={completionDisabled}
      onToggleComplete={onToggleComplete}
    />
  );
}

function FunnyPagesView({
  page,
  complete,
  completionDisabled,
  onToggleComplete,
}: {
  page: Extract<DigestPage, { pluginType: "funny-pages" }>;
  complete: boolean;
  completionDisabled: boolean;
  onToggleComplete: () => void;
}) {
  return (
    <article className="rounded-[2rem] border border-border/80 bg-background/90 p-5 shadow-[0_24px_70px_var(--shadow)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            <Sparkles className="size-3.5" />
            Funny pages
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{page.title}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatPill label="Minutes" value={`${page.estimatedMinutes}`} />
          <StatPill label="Strips" value={`${page.strips.length}`} />
        </div>
      </div>

      <div className="mt-6">
        {page.strips.map((strip, index) => (
          <div
            key={strip.id}
            className={index === 0 ? "" : "mt-6 border-t border-border/80 pt-6"}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-2xl font-semibold tracking-tight text-foreground">{strip.label}</h3>
              <a
                className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-primary hover:text-primary"
                href={strip.url}
                rel="noreferrer"
                target="_blank"
              >
                Read at source
              </a>
            </div>
            <img
              alt={`${strip.label} comic strip`}
              className="mt-4 w-full rounded-[1rem] border border-border bg-background"
              loading="lazy"
              src={strip.imageUrl}
            />
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <CompletionButton
          complete={complete}
          disabled={completionDisabled}
          onClick={onToggleComplete}
        />
      </div>
    </article>
  );
}

function MissingClerkConfig() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-4xl items-center px-4 py-10">
        <section className="w-full rounded-[2.5rem] border border-border/80 bg-background/85 p-8 shadow-[0_28px_90px_var(--shadow)] backdrop-blur">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            <Sparkles className="size-3.5" />
            Sign-in
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground">
            Sign-in is not configured yet.
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Add `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_PUBLISHABLE_KEY`, and
            `CLERK_SECRET_KEY` before starting the app.
          </p>
        </section>
      </div>
    </main>
  );
}

function AuthenticatedApp() {
  const { getToken, isLoaded: authLoaded, isSignedIn, userId } = useAuth();
  const [view, setView] = useState<View>("today");
  const [booting, setBooting] = useState(true);
  const [loadingDigest, setLoadingDigest] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savingAISettings, setSavingAISettings] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [refreshingPluginId, setRefreshingPluginId] = useState<string | null>(null);
  const [savingCompletion, setSavingCompletion] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [aiSettings, setAISettings] = useState<AISettings | null>(null);
  const [openAIKeyDraft, setOpenAIKeyDraft] = useState("");
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [digest, setDigest] = useState<StoredDigest | null>(null);
  const [completion, setCompletion] = useState<CompletionRecord | null>(null);
  const [habits, setHabits] = useState<HabitsResponse | null>(null);
  const [archiveDates, setArchiveDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(today());
  const [pageIndex, setPageIndex] = useState(0);
  const [expandedPlugins, setExpandedPlugins] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const bootstrapInFlightRef = useRef<Promise<void> | null>(null);
  const bootstrappedUserRef = useRef<string | null>(null);

  const activePage = digest?.pages[pageIndex] ?? null;
  const pageTabs = useMemo(
    () =>
      digest?.pages.map((page) => ({
        id: page.id,
        title: page.title,
        pluginType: page.pluginType,
      })) ??
      (config?.plugins ?? [])
        .filter((plugin) => plugin.enabled)
        .map((plugin) => ({
          id: plugin.instanceId,
          title: plugin.title,
          pluginType: plugin.type,
        })),
    [config?.plugins, digest?.pages],
  );

  const clearAuthenticatedState = useEffectEvent(() => {
    startTransition(() => {
      setSession(null);
      setPreferences(null);
      setAISettings(null);
      setOpenAIKeyDraft("");
      setConfig(null);
      setDigest(null);
      setCompletion(null);
      setHabits(null);
      setArchiveDates([]);
    });
  });

  const authorizedRequest = useEffectEvent(async <T,>(input: string, init?: RequestInit) => {
    const token = await getToken();

    if (!token) {
      throw new Error("Your sign-in session has expired. Please sign in again.");
    }

    return requestJson<T>(input, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        authorization: `Bearer ${token}`,
      },
    });
  });

  const bootstrapApp = useEffectEvent(async (showLoader = false) => {
    logApp("bootstrap:start", {
      showLoader,
      booting,
      authUser: userId ?? null,
    });

    if (bootstrapInFlightRef.current) {
      logApp("bootstrap:join_inflight");
      await bootstrapInFlightRef.current;
      return;
    }

    const task = (async () => {
      if (showLoader) {
        setBooting(true);
      }

      setError(null);

      try {
        const payload = await authorizedRequest<AppBootstrapResponse>(
          "/.netlify/functions/bootstrap",
          {
            method: "GET",
          },
        );

        logApp("bootstrap:response", {
          authenticated: Boolean(payload.session),
          archiveCount: payload.archiveDates.length,
          pluginCount: payload.config?.plugins.length ?? 0,
        });

        startTransition(() => {
          setSession(payload.session);
          setPreferences(payload.preferences);
          setAISettings(payload.aiSettings);
          setConfig(payload.config);
          setArchiveDates(payload.archiveDates);
        });

        if (payload.session) {
          logApp("bootstrap:load_digest", { date: today() });
          if (showLoader) {
            setBooting(false);
          }
          void loadDigest(today());
        } else {
          logApp("bootstrap:signed_out");
          clearAuthenticatedState();
          if (showLoader) {
            setBooting(false);
          }
        }
      } catch (requestError) {
        bootstrappedUserRef.current = null;
        logApp("bootstrap:error", {
          message:
            requestError instanceof Error ? requestError.message : "We could not open your edition.",
        });
        setError(
          requestError instanceof Error ? requestError.message : "We could not open your edition.",
        );
      } finally {
        logApp("bootstrap:end", { showLoader });
      }
    })();

    bootstrapInFlightRef.current = task;

    try {
      await task;
    } finally {
      bootstrapInFlightRef.current = null;
    }
  });

  useEffect(() => {
    const root = document.documentElement;

    if (!preferences) {
      root.dataset.themeMode = "light";
      root.dataset.colorScheme = "default";
      root.dataset.typography = "editorial";
      root.dataset.fontScale = "md";
      return;
    }

    root.dataset.themeMode = preferences.themeMode;
    root.dataset.colorScheme = preferences.colorScheme;
    root.dataset.typography = preferences.typographyPreset;
    root.dataset.fontScale = preferences.fontScale;
  }, [preferences]);

  useEffect(() => {
    logApp("auth:state", {
      authLoaded,
      isSignedIn,
      authUser: userId ?? null,
    });

    if (!authLoaded) {
      return;
    }

    if (!isSignedIn || !userId) {
      bootstrappedUserRef.current = null;
      logApp("init:anonymous_landing");
      clearAuthenticatedState();
      setBooting(false);
      return;
    }

    if (bootstrappedUserRef.current === userId) {
      setBooting(false);
      return;
    }

    bootstrappedUserRef.current = userId;
    void bootstrapApp(true);
  }, [authLoaded, bootstrapApp, clearAuthenticatedState, isSignedIn, userId]);

  useEffect(() => {
    if (view !== "habits" || !session || habits) {
      return;
    }

    let cancelled = false;

    async function loadHabits() {
      try {
        const url = new URL("/.netlify/functions/habits", window.location.origin);
        url.searchParams.set("days", "7");
        url.searchParams.set("tz", Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
        const payload = await authorizedRequest<HabitsResponse>(`${url.pathname}${url.search}`, {
          method: "GET",
        });

        if (!cancelled) {
          setHabits(payload);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError instanceof Error ? requestError.message : "We could not load your reading week.",
          );
        }
      }
    }

    void loadHabits();

    return () => {
      cancelled = true;
    };
  }, [authorizedRequest, habits, session, view]);

  async function loadDigest(date: string, options?: { force?: boolean }) {
    const force = options?.force === true;
    logApp("digest:start", { date, force });
    setLoadingDigest(true);
    setError(null);

    try {
      const url = new URL("/.netlify/functions/digest", window.location.origin);
      url.searchParams.set("date", date);

      if (force) {
        url.searchParams.set("force", "1");
      }

      const payload = await authorizedRequest<DigestApiResponse>(
        `${url.pathname}${url.search}`,
        {
          method: "GET",
        },
      );

      logApp("digest:response", {
        date,
        pageCount: payload.digest.pages.length,
        fromCache: payload.fromCache,
      });

      startTransition(() => {
        setDigest(payload.digest);
        setCompletion(payload.completion);
        setArchiveDates(payload.archiveDates ?? archiveDates);
        setSelectedDate(date);
        setPageIndex(0);
      });
    } catch (requestError) {
      logApp("digest:error", {
        date,
        message: requestError instanceof Error ? requestError.message : "We could not load this edition.",
      });
      setError(requestError instanceof Error ? requestError.message : "We could not load this edition.");
    } finally {
      logApp("digest:end", { date });
      setLoadingDigest(false);
    }
  }

  async function saveAppearance() {
    if (!preferences) {
      return;
    }

    setSavingPreferences(true);
    setError(null);

    try {
      const payload = await authorizedRequest<PreferencesResponse>(
        "/.netlify/functions/preferences",
        {
          method: "PUT",
          body: JSON.stringify(preferences),
        },
      );
      setPreferences(payload.preferences);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "We could not save your reading settings.",
      );
    } finally {
      setSavingPreferences(false);
    }
  }

  async function saveAISettings(clearKey = false) {
    if (!aiSettings) {
      return;
    }

    setSavingAISettings(true);
    setError(null);

    try {
      const payload = await authorizedRequest<AISettingsResponse>("/.netlify/functions/ai-settings", {
        method: "PUT",
        body: JSON.stringify({
          apiKey: clearKey ? undefined : openAIKeyDraft.trim() || undefined,
          clearKey,
          model: aiSettings.model,
        }),
      });

      setAISettings(payload.settings);

      if (clearKey || openAIKeyDraft.trim().length > 0) {
        setOpenAIKeyDraft("");
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "We could not save your editorial settings.",
      );
    } finally {
      setSavingAISettings(false);
    }
  }

  async function savePluginConfig(options?: { forceRefresh?: boolean }) {
    if (!config) {
      return;
    }

    setSavingConfig(true);
    setError(null);

    try {
      const payload = await authorizedRequest<ConfigResponse>("/.netlify/functions/config", {
        method: "PUT",
        body: JSON.stringify(config),
      });
      setConfig(payload.config);
      setHabits(null);

      if (options?.forceRefresh) {
        await loadDigest(today(), { force: true });
      } else if (selectedDate === today()) {
        await loadDigest(today());
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "We could not save your pages.",
      );
    } finally {
      setSavingConfig(false);
    }
  }

  async function forceRefreshPages() {
    setRefreshingPluginId("all");

    try {
      await savePluginConfig({ forceRefresh: true });
    } finally {
      setRefreshingPluginId(null);
    }
  }

  async function markComplete(pluginInstanceId: string, completed: boolean) {
    if (!digest) {
      return;
    }

    setSavingCompletion(true);
    setError(null);

    try {
      const payload = await authorizedRequest<{ completion: CompletionRecord }>(
        "/.netlify/functions/completion",
        {
          method: "POST",
          body: JSON.stringify({
            date: digest.date,
            pluginInstanceId,
            completed,
          }),
        },
      );

      setCompletion(payload.completion);
      setHabits(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "We could not save that just yet.",
      );
    } finally {
      setSavingCompletion(false);
    }
  }

  const loadAlbumTrack = useEffectEvent(async (pluginInstanceId: string, trackId: string) => {
    const token = await getToken();

    if (!token) {
      throw new Error("Your sign-in session has expired. Please sign in again.");
    }
    const url = new URL("/.netlify/functions/plex-stream", window.location.origin);

    url.searchParams.set("date", selectedDate);
    url.searchParams.set("pluginInstanceId", pluginInstanceId);
    url.searchParams.set("trackId", trackId);

    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      let message = "This track could not be loaded.";

      try {
        const payload = (await response.json()) as { error?: string };
        message = payload.error ?? message;
      } catch {
        // Ignore and use the default message.
      }

      throw new Error(message);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  });

  function updatePlugin(instanceId: string, updater: (plugin: PluginInstance) => PluginInstance) {
    setConfig((current) => {
      if (!current) {
        return current;
      }

      return {
        plugins: current.plugins.map((plugin) =>
          plugin.instanceId === instanceId ? updater(plugin) : plugin,
        ),
      };
    });
  }

  function removePlugin(instanceId: string) {
    setConfig((current) => {
      if (!current || current.plugins.length === 1) {
        return current;
      }

      return {
        plugins: current.plugins.filter((plugin) => plugin.instanceId !== instanceId),
      };
    });
  }

  function togglePluginExpanded(instanceId: string) {
    setExpandedPlugins((current) =>
      current.includes(instanceId)
        ? current.filter((entry) => entry !== instanceId)
        : [...current, instanceId],
    );
  }

  function movePlugin(instanceId: string, direction: "up" | "down") {
    setConfig((current) => {
      if (!current) {
        return current;
      }

      const index = current.plugins.findIndex((plugin) => plugin.instanceId === instanceId);

      if (index === -1) {
        return current;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= current.plugins.length) {
        return current;
      }

      return {
        plugins: moveArrayItem(current.plugins, index, targetIndex),
      };
    });
  }

  function renderDigest() {
    if (loadingDigest || booting) {
      return (
        <div className="flex min-h-[24rem] items-center justify-center rounded-[2rem] border border-border/80 bg-background/80 p-6 shadow-[0_24px_70px_var(--shadow)]">
          <LoaderCircle className="size-6 animate-spin text-primary" />
        </div>
      );
    }

    if (!digest || !activePage) {
      return (
        <div className="rounded-[2rem] border border-border/80 bg-background/80 p-6 shadow-[0_24px_70px_var(--shadow)]">
          <p className="text-sm text-muted-foreground">Nothing is ready for this date yet.</p>
        </div>
      );
    }

    const complete = completionStatus(completion, activePage.pluginInstanceId);

    if (activePage.pluginType === "ap-headlines" || activePage.pluginType === "reuters-headlines") {
      return (
        <APPageView
          page={activePage}
          completionDisabled={savingCompletion}
          complete={complete}
          onToggleComplete={() => void markComplete(activePage.pluginInstanceId, !complete)}
        />
      );
    }

    if (activePage.pluginType === "rss-reader") {
      return (
        <div className="space-y-5">
          <RSSPageView page={activePage} />
          <div className="flex justify-center">
            <CompletionButton
              complete={complete}
              disabled={savingCompletion}
              onClick={() => void markComplete(activePage.pluginInstanceId, !complete)}
            />
          </div>
        </div>
      );
    }

    if (activePage.pluginType === "mangadex-reader") {
      return (
        <MangaPageView
          page={activePage}
          complete={complete}
          completionDisabled={savingCompletion}
          onToggleComplete={() => void markComplete(activePage.pluginInstanceId, !complete)}
        />
      );
    }

    if (activePage.pluginType === "readcomiconline-reader") {
      return (
        <ComicsPageView
          page={activePage}
          complete={complete}
          completionDisabled={savingCompletion}
          onToggleComplete={() => void markComplete(activePage.pluginInstanceId, !complete)}
        />
      );
    }

    if (activePage.pluginType === "funny-pages") {
      return (
        <FunnyPagesView
          page={activePage}
          complete={complete}
          completionDisabled={savingCompletion}
          onToggleComplete={() => void markComplete(activePage.pluginInstanceId, !complete)}
        />
      );
    }

    return (
      <AlbumPageView
        page={activePage}
        complete={complete}
        completionDisabled={savingCompletion}
        onLoadTrack={loadAlbumTrack}
        onToggleComplete={() => void markComplete(activePage.pluginInstanceId, !complete)}
      />
    );
  }

  const completionRate = useMemo(() => {
    if (!completion) {
      return "0/0";
    }

    const states = Object.values(completion.plugins);
    const completed = states.filter((state) => state.completed).length;
    return `${completed}/${states.length}`;
  }, [completion]);

  if (booting) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4">
          <LoaderCircle className="size-7 animate-spin text-primary" />
        </div>
      </main>
    );
  }

  if (!session || !preferences || !config || !aiSettings) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10">
          <div className="grid w-full gap-6 md:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[2.5rem] border border-border/80 bg-background/85 p-8 shadow-[0_28px_90px_var(--shadow)] backdrop-blur">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                <Sparkles className="size-3.5" />
                Daily digest
              </div>
              <h1 className="mt-6 text-5xl font-semibold tracking-tight text-foreground">
                Start the day feeling informed, not depleted.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
                Newsreader turns the morning scroll into a small, deliberate ritual: a few
                important headlines, one worthwhile long read, and then you are done. No
                feed to fall into, no frantic catching up, just a digest with some taste.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <SignInButton>
                  <Button size="lg">Sign in</Button>
                </SignInButton>
                <div className="rounded-full border border-border bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                  Built for people who still want the news, just not the churn.
                </div>
              </div>
              {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
            </section>

            <section className="rounded-[2.5rem] border border-border/80 bg-card/80 p-6 shadow-[0_24px_70px_var(--shadow)]">
              <div className="space-y-4">
                <div className="rounded-[1.75rem] border border-border bg-background/90 p-5">
                  <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Page one
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold">AP Front Page</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    A brisk first pass through the day: a handful of stories that matter,
                    chosen to give shape instead of noise.
                  </p>
                </div>
                <div className="rounded-[1.75rem] border border-border bg-background/90 p-5">
                  <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Page two
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold">Reader</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    A single essay, column, or notebook entry worth lingering over, drawn from
                    the writers you actually care to read.
                  </p>
                </div>
                <div className="rounded-[1.75rem] border border-border bg-background/90 p-5">
                  <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Habits
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold">A week in pages</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    A quiet record of what you finished, enough structure to help the habit hold.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 md:px-6 md:py-6">
        <header className="rounded-[2rem] border border-border/80 bg-background/80 p-5 shadow-[0_24px_70px_var(--shadow)] backdrop-blur">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 max-w-xl">
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
                  Good morning, {firstName(session.user.name)}.
                </h1>
              </div>
              <div className="flex flex-wrap gap-2 md:ml-auto md:justify-end">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-2 text-sm font-medium text-muted-foreground">
                  <BookCheck className="size-4" />
                  Today {completionRate}
                </div>
                <Button variant="outline" onClick={() => setView("archive")}>
                  <CalendarDays className="mr-2 size-4" />
                  Archive
                </Button>
                <Button variant="outline" onClick={() => setView("settings")}>
                  <Settings2 className="mr-2 size-4" />
                  Settings
                </Button>
              </div>
            </div>

            <p className="w-full text-base italic leading-7 text-muted-foreground">
              {morningLine(today())}
            </p>

            <div className="flex flex-wrap gap-2">
              {pageTabs.map((page, index) => (
                <NavButton
                  key={page.id}
                  active={(view === "today" || view === "archive") && pageIndex === index}
                  icon={pluginTabIcon(page.pluginType)}
                  label={page.title}
                  onClick={() => {
                    setPageIndex(index);
                    setView((current) => (current === "archive" ? "archive" : "today"));
                  }}
                />
              ))}
              <NavButton
                active={view === "habits"}
                icon={<BookCheck className="size-4" />}
                label="Habits"
                onClick={() => setView("habits")}
              />
            </div>
          </div>
        </header>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="mt-4 flex-1">
          {view === "today" ? (
            renderDigest()
          ) : null}

          {view === "archive" ? (
            <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
              <aside className="rounded-[2rem] border border-border/80 bg-background/80 p-4 shadow-[0_24px_70px_var(--shadow)]">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Archive</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setView("today");

                      if (selectedDate !== today()) {
                        void loadDigest(today());
                      }
                    }}
                  >
                    Today
                  </Button>
                </div>
                <div className="mt-4 space-y-2">
                  {archiveDates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Your archive will begin here.</p>
                  ) : (
                    archiveDates.map((date) => (
                      <button
                        key={date}
                        className={
                          selectedDate === date
                            ? "w-full rounded-2xl bg-primary px-4 py-3 text-left text-sm font-medium text-primary-foreground"
                            : "w-full rounded-2xl border border-border bg-background/70 px-4 py-3 text-left text-sm font-medium text-foreground"
                        }
                        type="button"
                        onClick={() => {
                          setView("archive");
                          void loadDigest(date);
                        }}
                      >
                        {formatDate(date)}
                      </button>
                    ))
                  )}
                </div>
              </aside>

              <div>{renderDigest()}</div>
            </div>
          ) : null}

          {view === "habits" ? (
            <div className="rounded-[2rem] border border-border/80 bg-background/80 p-5 shadow-[0_24px_70px_var(--shadow)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Reading habits</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    A quiet record of what you finished over the last seven days.
                  </p>
                </div>
              </div>

              {!habits ? (
                <div className="mt-8 flex justify-center">
                  <LoaderCircle className="size-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-2">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Page
                        </th>
                        {habits.days.map((date) => (
                          <th
                            key={date}
                            className="px-2 py-2 text-center text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground"
                          >
                            {date.slice(5)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {habits.rows.map((row) => (
                        <tr key={row.pluginInstanceId}>
                          <td className="min-w-40 rounded-2xl border border-border bg-background/90 px-3 py-3 text-sm font-medium text-foreground">
                            {row.title}
                          </td>
                          {row.days.map((cell) => (
                            <td
                              key={`${row.pluginInstanceId}-${cell.date}`}
                              className="px-1 py-1 align-middle"
                            >
                              <div
                                className={
                                  cell.status === "complete"
                                    ? "mx-auto h-10 w-10 rounded-2xl bg-primary"
                                    : cell.status === "incomplete"
                                      ? "mx-auto h-10 w-10 rounded-2xl border border-border bg-muted"
                                      : "mx-auto h-10 w-10 rounded-2xl border border-dashed border-border/70 bg-transparent"
                                }
                                title={`${row.title}: ${cell.status} on ${cell.date}`}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          {view === "settings" ? (
            <div className="space-y-4">
              <section className="rounded-[2rem] border border-border/80 bg-background/80 p-5 shadow-[0_24px_70px_var(--shadow)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Account</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Signed in on this device. Leave whenever you like.
                    </p>
                  </div>
                  <SignOutButton redirectUrl={window.location.origin}>
                    <Button variant="outline" type="button">
                      Sign out
                    </Button>
                  </SignOutButton>
                </div>
              </section>

              <section className="rounded-[2rem] border border-border/80 bg-background/80 p-5 shadow-[0_24px_70px_var(--shadow)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Appearance</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Tune the page until it feels like a place you want to read.
                    </p>
                  </div>
                  <Button disabled={savingPreferences} onClick={() => void saveAppearance()}>
                    {savingPreferences ? (
                      <>
                        <LoaderCircle className="mr-2 size-4 animate-spin" />
                        Saving
                      </>
                    ) : (
                      <>
                        <Palette className="mr-2 size-4" />
                        Save appearance
                      </>
                    )}
                  </Button>
                </div>

                <div className="mt-6 space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-foreground">Mode</span>
                      <select
                        className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                        value={preferences.themeMode}
                        onChange={(event) =>
                          setPreferences((current) =>
                            current
                              ? { ...clonePreferences(current), themeMode: event.target.value as ThemeMode }
                              : current,
                          )
                        }
                      >
                        {THEME_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-foreground">Font scale</span>
                      <select
                        className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                        value={preferences.fontScale}
                        onChange={(event) =>
                          setPreferences((current) =>
                            current
                              ? { ...clonePreferences(current), fontScale: event.target.value as FontScale }
                              : current,
                          )
                        }
                      >
                        {FONT_SCALES.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-foreground">Color scheme</div>
                    <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                      {COLOR_SCHEMES.map((option) => (
                        <ColorSchemePreview
                          key={option}
                          active={preferences.colorScheme === option}
                          mode={preferences.themeMode}
                          scheme={option}
                          onClick={() =>
                            setPreferences((current) =>
                              current
                                ? {
                                    ...clonePreferences(current),
                                    colorScheme: option,
                                  }
                                : current,
                            )
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-foreground">Typography</div>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {TYPOGRAPHY_PRESETS.map((option) => (
                        <TypographyPreview
                          key={option}
                          active={preferences.typographyPreset === option}
                          preset={option}
                          onClick={() =>
                            setPreferences((current) =>
                              current
                                ? {
                                    ...clonePreferences(current),
                                    typographyPreset: option,
                                  }
                                : current,
                            )
                          }
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {aiSettings ? (
                <section className="rounded-[2rem] border border-border/80 bg-background/80 p-5 shadow-[0_24px_70px_var(--shadow)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Editorial picks</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      If you want a stronger editorial hand, connect your own OpenAI key.
                      Otherwise Newsreader sticks to simple, dependable rules.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        disabled={savingAISettings || !aiSettings.hasKey}
                        onClick={() => void saveAISettings(true)}
                      >
                        Remove key
                      </Button>
                      <Button disabled={savingAISettings} onClick={() => void saveAISettings()}>
                        {savingAISettings ? (
                          <>
                            <LoaderCircle className="mr-2 size-4 animate-spin" />
                            Saving
                          </>
                        ) : (
                          "Save editorial settings"
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-foreground">Model</span>
                      <input
                        className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                        type="text"
                        value={aiSettings.model}
                        onChange={(event) =>
                          setAISettings((current) =>
                            current
                              ? {
                                  ...current,
                                  model: event.target.value,
                                }
                              : current,
                          )
                        }
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-foreground">Your OpenAI key</span>
                      <input
                        className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                        type="password"
                        autoComplete="off"
                        placeholder={aiSettings.hasKey ? "Paste a new key to replace the one on file." : "sk-..."}
                        value={openAIKeyDraft}
                        onChange={(event) => setOpenAIKeyDraft(event.target.value)}
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatPill label="Key" value={aiSettings.hasKey ? "Configured" : "Missing"} />
                    <StatPill label="Model" value={aiSettings.model} />
                  </div>
                </section>
              ) : null}

              <section className="rounded-[2rem] border border-border/80 bg-background/80 p-5 shadow-[0_24px_70px_var(--shadow)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Reading pages</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Arrange the edition to your taste. Changes shape what comes next, not what is already on the shelf.
                    </p>
                  </div>
                  <div className="flex w-full flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      {PLUGIN_ADD_ORDER.map((pluginType) => {
                        const definition = PLUGIN_DEFINITIONS[pluginType];

                        return (
                          <Button
                            key={pluginType}
                            variant="outline"
                            onClick={() =>
                              setConfig((current) =>
                                current
                                  ? {
                                      plugins: [
                                        ...current.plugins,
                                        createUniquePlugin(current.plugins, pluginType),
                                      ],
                                    }
                                  : current,
                              )
                            }
                          >
                            <Plus className="mr-2 size-4" />
                            {definition.addLabel}
                          </Button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        disabled={savingConfig || refreshingPluginId === "all"}
                        onClick={() => void forceRefreshPages()}
                      >
                        {refreshingPluginId === "all" ? (
                          <>
                            <LoaderCircle className="mr-2 size-4 animate-spin" />
                            Refreshing
                          </>
                        ) : (
                          "Refresh today"
                        )}
                      </Button>
                      <Button disabled={savingConfig} onClick={() => void savePluginConfig()}>
                        {savingConfig ? (
                          <>
                            <LoaderCircle className="mr-2 size-4 animate-spin" />
                            Saving
                          </>
                        ) : (
                          "Save pages"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {config.plugins.map((plugin, index) => (
                    <article
                      key={plugin.instanceId}
                      className="rounded-[1.75rem] border border-border bg-background/90 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1">
                          <button
                            className="flex w-full items-center gap-3 text-left"
                            type="button"
                            onClick={() => togglePluginExpanded(plugin.instanceId)}
                          >
                            {expandedPlugins.includes(plugin.instanceId) ? (
                              <ChevronDown className="size-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="size-4 text-muted-foreground" />
                            )}
                            <span className="text-xl font-semibold tracking-tight">{plugin.title}</span>
                          </button>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {pluginSettingsDescription(plugin)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={index === 0}
                            onClick={() => movePlugin(plugin.instanceId, "up")}
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={index === config.plugins.length - 1}
                            onClick={() => movePlugin(plugin.instanceId, "down")}
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                          <button
                            className={
                              plugin.enabled
                                ? "rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                                : "rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground"
                            }
                            type="button"
                            onClick={() =>
                              updatePlugin(plugin.instanceId, (current) => ({
                                ...current,
                                enabled: !current.enabled,
                              }))
                            }
                          >
                            {plugin.enabled ? "In the edition" : "Out of the edition"}
                          </button>
                          <button
                            className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground"
                            type="button"
                            onClick={() => removePlugin(plugin.instanceId)}
                          >
                            <Trash2 className="mr-2 size-4" />
                            Remove
                          </button>
                        </div>
                      </div>

                      {expandedPlugins.includes(plugin.instanceId) ? (
                        <>
                          <div className="mt-5 grid gap-4 md:grid-cols-2">
                            <label className="block md:col-span-2">
                              <span className="text-sm font-medium text-foreground">Page title</span>
                              <input
                                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                                type="text"
                                value={plugin.title}
                                onChange={(event) =>
                                  updatePlugin(plugin.instanceId, (current) => ({
                                    ...current,
                                    title: event.target.value,
                                  }))
                                }
                              />
                            </label>

                            <label className="block">
                              <span className="text-sm font-medium text-foreground">Reading time</span>
                              <input
                                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                                type="number"
                                min={3}
                                max={60}
                                value={plugin.estimatedMinutes}
                                onChange={(event) =>
                                  updatePlugin(plugin.instanceId, (current) => ({
                                    ...current,
                                    estimatedMinutes: Number(event.target.value),
                                  }))
                                }
                              />
                            </label>

                            {plugin.type === "ap-headlines" || plugin.type === "reuters-headlines" ? (
                              <label className="block">
                                <span className="text-sm font-medium text-foreground">Story count</span>
                                <input
                                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                                  type="number"
                                  min={2}
                                  max={8}
                                  value={plugin.config.storyCount}
                                  onChange={(event) =>
                                    updatePlugin(plugin.instanceId, (current) =>
                                      current.type === "ap-headlines" || current.type === "reuters-headlines"
                                        ? {
                                            ...current,
                                            config: {
                                              ...current.config,
                                              storyCount: Number(event.target.value),
                                            },
                                          }
                                        : current,
                                    )
                                  }
                                />
                              </label>
                            ) : plugin.type === "rss-reader" ? (
                              <label className="block">
                                <span className="text-sm font-medium text-foreground">Items per day</span>
                                <input
                                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                                  type="number"
                                  min={1}
                                  max={3}
                                  value={plugin.config.itemsPerDay}
                                  onChange={(event) =>
                                    updatePlugin(plugin.instanceId, (current) =>
                                      current.type === "rss-reader"
                                        ? {
                                            ...current,
                                            config: {
                                              ...current.config,
                                              itemsPerDay: Number(event.target.value),
                                            },
                                          }
                                        : current,
                                    )
                                  }
                                />
                              </label>
                            ) : plugin.type === "album-of-the-day" ? (
                              <label className="block">
                                <span className="text-sm font-medium text-foreground">How to choose</span>
                                <select
                                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                                  value={plugin.config.strategy}
                                  onChange={(event) =>
                                    updatePlugin(plugin.instanceId, (current) =>
                                      current.type === "album-of-the-day"
                                        ? {
                                            ...current,
                                            config: {
                                              ...current.config,
                                              strategy: event.target.value as AlbumSelectionStrategy,
                                            },
                                          }
                                        : current,
                                    )
                                  }
                                >
                                  {ALBUM_STRATEGIES.map((strategy) => (
                                    <option key={strategy} value={strategy}>
                                      {strategy}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            ) : plugin.type === "funny-pages" ? (
                              <label className="block">
                                <span className="text-sm font-medium text-foreground">Sources</span>
                                <input
                                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground"
                                  type="text"
                                  readOnly
                                  value={`${plugin.config.comics.length}`}
                                />
                              </label>
                            ) : plugin.type === "readcomiconline-reader" ? (
                              <label className="block">
                                <span className="text-sm font-medium text-foreground">Chapters per day</span>
                                <input
                                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground"
                                  type="text"
                                  readOnly
                                  value="1"
                                />
                              </label>
                            ) : (
                              <label className="block">
                                <span className="text-sm font-medium text-foreground">Volumes per day</span>
                                <input
                                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground"
                                  type="text"
                                  readOnly
                                  value="1"
                                />
                              </label>
                            )}
                          </div>

                          {plugin.type === "ap-headlines" || plugin.type === "reuters-headlines" ? (
                            <div className="mt-5">
                              <div className="space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="text-sm font-medium text-foreground">Sections</div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      updatePlugin(plugin.instanceId, (current) =>
                                        current.type === "ap-headlines" || current.type === "reuters-headlines"
                                          ? {
                                              ...current,
                                              config: {
                                                ...current.config,
                                                sources: [
                                                  ...current.config.sources,
                                                  createHeadlineSourceDraft(),
                                                ],
                                              },
                                            }
                                          : current,
                                      )
                                    }
                                  >
                                    <Plus className="mr-2 size-4" />
                                    Add section
                                  </Button>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {AP_TOPIC_OPTIONS.map((topic) => {
                                    const active = plugin.config.sources.some(
                                      (source) => source.topic === topic.id,
                                    );

                                    return (
                                      <button
                                        key={topic.id}
                                        className={
                                          active
                                            ? "rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                                            : "rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground"
                                        }
                                        type="button"
                                        onClick={() =>
                                          updatePlugin(plugin.instanceId, (current) =>
                                            current.type === "ap-headlines" || current.type === "reuters-headlines"
                                              ? active
                                                ? {
                                                    ...current,
                                                    config: {
                                                      ...current.config,
                                                      sources: current.config.sources.filter(
                                                        (source) => source.topic !== topic.id,
                                                      ),
                                                    },
                                                  }
                                                : {
                                                    ...current,
                                                    config: {
                                                      ...current.config,
                                                      sources: [
                                                        ...current.config.sources,
                                                        createHeadlineSourceDraft(topic.id),
                                                      ],
                                                    },
                                                  }
                                              : current,
                                          )
                                        }
                                      >
                                        {topic.label}
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="space-y-3">
                                  {plugin.config.sources.map((source) => (
                                    <div
                                      key={source.id}
                                      className="rounded-[1.25rem] border border-border bg-background px-4 py-4"
                                    >
                                      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                                        <input
                                          className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                                          type="text"
                                          value={source.label}
                                          onChange={(event) =>
                                            updatePlugin(plugin.instanceId, (current) =>
                                              current.type === "ap-headlines" || current.type === "reuters-headlines"
                                                ? {
                                                    ...current,
                                                    config: {
                                                      ...current.config,
                                                      sources: current.config.sources.map((item) =>
                                                        item.id === source.id
                                                          ? { ...item, label: event.target.value }
                                                          : item,
                                                      ),
                                                    },
                                                  }
                                                : current,
                                            )
                                          }
                                        />
                                        <select
                                          className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                                          value={source.topic}
                                          onChange={(event) =>
                                            updatePlugin(plugin.instanceId, (current) =>
                                              current.type === "ap-headlines" || current.type === "reuters-headlines"
                                                ? {
                                                    ...current,
                                                    config: {
                                                      ...current.config,
                                                      sources: current.config.sources.map((item) =>
                                                        item.id === source.id
                                                          ? {
                                                              ...item,
                                                              topic: event.target.value as (typeof AP_TOPIC_OPTIONS)[number]["id"],
                                                            }
                                                          : item,
                                                      ),
                                                    },
                                                  }
                                                : current,
                                            )
                                          }
                                        >
                                          {AP_TOPIC_OPTIONS.map((topic) => (
                                            <option key={topic.id} value={topic.id}>
                                              {topic.label}
                                            </option>
                                          ))}
                                        </select>
                                        <Button
                                          variant="outline"
                                          disabled={plugin.config.sources.length <= 1}
                                          onClick={() =>
                                            updatePlugin(plugin.instanceId, (current) =>
                                              current.type === "ap-headlines" || current.type === "reuters-headlines"
                                                ? {
                                                    ...current,
                                                    config: {
                                                      ...current.config,
                                                      sources: current.config.sources.filter(
                                                        (item) => item.id !== source.id,
                                                      ),
                                                    },
                                                  }
                                                : current,
                                            )
                                          }
                                        >
                                          <Trash2 className="size-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ) : plugin.type === "rss-reader" ? (
                            <div className="mt-5 space-y-4">
                              <label className="block">
                                <span className="text-sm font-medium text-foreground">How to choose</span>
                                <select
                                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                                  value={plugin.config.strategy}
                                  onChange={(event) =>
                                    updatePlugin(plugin.instanceId, (current) =>
                                      current.type === "rss-reader"
                                        ? {
                                            ...current,
                                            config: {
                                              ...current.config,
                                              strategy: event.target.value as FeedSelectionStrategy,
                                            },
                                          }
                                        : current,
                                    )
                                  }
                                >
                                  {STRATEGIES.map((strategy) => (
                                    <option key={strategy} value={strategy}>
                                      {strategy === "best-of-day"
                                        ? "Best of the day (uses your OpenAI key)"
                                        : strategy}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <div className="space-y-3">
                                <div className="space-y-3">
                                  {RSS_PRESET_GROUPS.map((group) => (
                                    <div
                                      key={group.id}
                                      className="rounded-[1.25rem] border border-border bg-background px-4 py-4"
                                    >
                                      <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                          <div className="text-sm font-medium text-foreground">{group.label}</div>
                                          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                                            {group.blurb}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        {group.feeds.map((feed) => {
                                          const active = plugin.config.feeds.some(
                                            (item) => item.url === feed.url,
                                          );

                                          return (
                                            <button
                                              key={feed.id}
                                              className={
                                                active
                                                  ? "rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                                                  : "rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground"
                                              }
                                              type="button"
                                              onClick={() =>
                                                updatePlugin(plugin.instanceId, (current) =>
                                                  current.type === "rss-reader"
                                                    ? active
                                                      ? {
                                                          ...current,
                                                          config: {
                                                            ...current.config,
                                                            feeds: current.config.feeds.filter(
                                                              (item) => item.url !== feed.url,
                                                            ),
                                                          },
                                                        }
                                                      : {
                                                          ...current,
                                                          config: {
                                                            ...current.config,
                                                            feeds: [...current.config.feeds, { ...feed }],
                                                          },
                                                        }
                                                    : current,
                                                )
                                              }
                                            >
                                              {feed.label}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-sm font-medium text-foreground">Sources</div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      updatePlugin(plugin.instanceId, (current) =>
                                        current.type === "rss-reader"
                                          ? {
                                              ...current,
                                              config: {
                                                ...current.config,
                                                feeds: [...current.config.feeds, createFeedDraft()],
                                              },
                                            }
                                          : current,
                                      )
                                    }
                                  >
                                    <Plus className="mr-2 size-4" />
                                    Add source
                                  </Button>
                                </div>

                                {plugin.config.feeds.map((feed) => (
                                  <div
                                    key={feed.id}
                                    className="rounded-[1.25rem] border border-border bg-background px-4 py-4"
                                  >
                                    <div className="grid gap-3 md:grid-cols-[1fr_1.4fr_auto]">
                                      <input
                                        className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                                        type="text"
                                        value={feed.label}
                                        onChange={(event) =>
                                          updatePlugin(plugin.instanceId, (current) =>
                                            current.type === "rss-reader"
                                              ? {
                                                  ...current,
                                                  config: {
                                                    ...current.config,
                                                    feeds: current.config.feeds.map((item) =>
                                                      item.id === feed.id
                                                        ? { ...item, label: event.target.value }
                                                        : item,
                                                    ),
                                                  },
                                                }
                                              : current,
                                          )
                                        }
                                      />
                                      <input
                                        className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                                        type="url"
                                        value={feed.url}
                                        onChange={(event) =>
                                          updatePlugin(plugin.instanceId, (current) =>
                                            current.type === "rss-reader"
                                              ? {
                                                  ...current,
                                                  config: {
                                                    ...current.config,
                                                    feeds: current.config.feeds.map((item) =>
                                                      item.id === feed.id
                                                        ? { ...item, url: event.target.value }
                                                        : item,
                                                    ),
                                                  },
                                                }
                                              : current,
                                          )
                                        }
                                      />
                                      <Button
                                        variant="outline"
                                        onClick={() =>
                                          updatePlugin(plugin.instanceId, (current) =>
                                            current.type === "rss-reader"
                                              ? {
                                                  ...current,
                                                  config: {
                                                    ...current.config,
                                                    feeds: current.config.feeds.filter((item) => item.id !== feed.id),
                                                  },
                                                }
                                              : current,
                                          )
                                        }
                                      >
                                        <Trash2 className="size-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : plugin.type === "album-of-the-day" ? (
                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                              <label className="block md:col-span-2">
                                <span className="text-sm font-medium text-foreground">Plex server URL</span>
                                <input
                                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                                  type="url"
                                  value={plugin.config.serverUrl}
                                  onChange={(event) =>
                                    updatePlugin(plugin.instanceId, (current) =>
                                      current.type === "album-of-the-day"
                                        ? {
                                            ...current,
                                            config: {
                                              ...current.config,
                                              serverUrl: event.target.value,
                                            },
                                          }
                                        : current,
                                    )
                                  }
                                />
                              </label>

                              <label className="block">
                                <span className="text-sm font-medium text-foreground">Plex token</span>
                                <input
                                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                                  type="password"
                                  autoComplete="off"
                                  value={plugin.config.token}
                                  onChange={(event) =>
                                    updatePlugin(plugin.instanceId, (current) =>
                                      current.type === "album-of-the-day"
                                        ? {
                                            ...current,
                                            config: {
                                              ...current.config,
                                              token: event.target.value,
                                            },
                                          }
                                        : current,
                                    )
                                  }
                                />
                              </label>

                              <label className="block">
                                <span className="text-sm font-medium text-foreground">Library section ID</span>
                                <input
                                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                                  type="text"
                                  value={plugin.config.librarySectionId}
                                  onChange={(event) =>
                                    updatePlugin(plugin.instanceId, (current) =>
                                      current.type === "album-of-the-day"
                                        ? {
                                            ...current,
                                            config: {
                                              ...current.config,
                                              librarySectionId: event.target.value,
                                            },
                                          }
                                        : current,
                                    )
                                  }
                                />
                              </label>

                              <p className="md:col-span-2 text-sm leading-6 text-muted-foreground">
                                Point this page at your music library and it will choose something
                                worth giving the room to.
                              </p>
                            </div>
                          ) : plugin.type === "funny-pages" ? (
                            <div className="mt-5 space-y-4">
                              <div className="space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="text-sm font-medium text-foreground">Comic presets</div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      updatePlugin(plugin.instanceId, (current) =>
                                        current.type === "funny-pages"
                                          ? {
                                              ...current,
                                              config: {
                                                ...current.config,
                                                comics: [
                                                  ...current.config.comics,
                                                  createFunnyPagesSourceDraft(),
                                                ],
                                              },
                                            }
                                          : current,
                                      )
                                    }
                                  >
                                    <Plus className="mr-2 size-4" />
                                    Add custom source
                                  </Button>
                                </div>

                                {FUNNY_PAGES_GROUPS.map((group) => (
                                  <div
                                    key={group.id}
                                    className="rounded-[1.25rem] border border-border bg-background px-4 py-4"
                                  >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div>
                                        <div className="text-sm font-medium text-foreground">{group.label}</div>
                                        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                                          {group.blurb}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {group.sources.map((preset) => {
                                        const active = plugin.config.comics.some(
                                          (comic) =>
                                            funnyPagesSourceKey(comic) === funnyPagesSourceKey(preset),
                                        );

                                        return (
                                          <button
                                            key={preset.id}
                                            className={
                                              active
                                                ? "rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                                                : "rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground"
                                            }
                                            type="button"
                                            onClick={() =>
                                              updatePlugin(plugin.instanceId, (current) =>
                                                current.type === "funny-pages"
                                                  ? active
                                                    ? {
                                                        ...current,
                                                        config: {
                                                          ...current.config,
                                                          comics: current.config.comics.filter(
                                                            (comic) =>
                                                              funnyPagesSourceKey(comic) !==
                                                              funnyPagesSourceKey(preset),
                                                          ),
                                                        },
                                                      }
                                                    : {
                                                        ...current,
                                                        config: {
                                                          ...current.config,
                                                          comics: [...current.config.comics, { ...preset }],
                                                        },
                                                      }
                                                  : current,
                                              )
                                            }
                                          >
                                            {preset.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="space-y-3">
                                {plugin.config.comics.map((comic) => (
                                  <div
                                    key={comic.id}
                                    className="rounded-[1.25rem] border border-border bg-background px-4 py-4"
                                  >
                                    <div className="grid gap-3 md:grid-cols-[1fr_12rem_1.4fr_auto]">
                                      <input
                                        className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                                        type="text"
                                        value={comic.label}
                                        onChange={(event) =>
                                          updatePlugin(plugin.instanceId, (current) =>
                                            current.type === "funny-pages"
                                              ? {
                                                  ...current,
                                                  config: {
                                                    ...current.config,
                                                    comics: current.config.comics.map((item) =>
                                                      item.id === comic.id
                                                        ? { ...item, label: event.target.value }
                                                        : item,
                                                    ),
                                                  },
                                                }
                                              : current,
                                          )
                                        }
                                      />
                                      <select
                                        className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                                        value={comic.provider}
                                        onChange={(event) =>
                                          updatePlugin(plugin.instanceId, (current) =>
                                            current.type === "funny-pages"
                                              ? {
                                                  ...current,
                                                  config: {
                                                    ...current.config,
                                                    comics: current.config.comics.map((item) =>
                                                      item.id === comic.id
                                                        ? {
                                                            ...item,
                                                            provider: event.target.value as "gocomics" | "latest-webcomic",
                                                            slug:
                                                              event.target.value === "gocomics"
                                                                ? item.slug ?? ""
                                                                : undefined,
                                                            url:
                                                              event.target.value === "latest-webcomic"
                                                                ? item.url ?? ""
                                                                : undefined,
                                                          }
                                                        : item,
                                                    ),
                                                  },
                                                }
                                              : current,
                                          )
                                        }
                                      >
                                        <option value="gocomics">GoComics</option>
                                        <option value="latest-webcomic">Latest webcomic</option>
                                      </select>
                                      <input
                                        className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                                        type="text"
                                        placeholder={
                                          comic.provider === "latest-webcomic"
                                            ? "Comic page URL"
                                            : "GoComics slug or URL"
                                        }
                                        value={comic.provider === "latest-webcomic" ? comic.url ?? "" : comic.slug ?? ""}
                                        onChange={(event) =>
                                          updatePlugin(plugin.instanceId, (current) =>
                                            current.type === "funny-pages"
                                              ? {
                                                  ...current,
                                                  config: {
                                                    ...current.config,
                                                    comics: current.config.comics.map((item) =>
                                                      item.id === comic.id
                                                        ? comic.provider === "latest-webcomic"
                                                          ? { ...item, url: event.target.value }
                                                          : { ...item, slug: event.target.value }
                                                        : item,
                                                    ),
                                                  },
                                                }
                                              : current,
                                          )
                                        }
                                      />
                                      <Button
                                        variant="outline"
                                        disabled={plugin.config.comics.length <= 1}
                                        onClick={() =>
                                          updatePlugin(plugin.instanceId, (current) =>
                                            current.type === "funny-pages"
                                              ? {
                                                  ...current,
                                                  config: {
                                                    ...current.config,
                                                    comics: current.config.comics.filter(
                                                      (item) => item.id !== comic.id,
                                                    ),
                                                  },
                                                }
                                              : current,
                                          )
                                        }
                                      >
                                        <Trash2 className="size-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <p className="text-sm leading-6 text-muted-foreground">
                                One strip appears from each source. Use a GoComics slug like{" "}
                                <span className="font-medium text-foreground">peanuts</span>, or a
                                direct comic-page URL for sources like Penny Arcade or SMBC.
                              </p>
                            </div>
                          ) : plugin.type === "mangadex-reader" ? (
                            <div className="mt-5 space-y-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="text-sm font-medium text-foreground">Series order</div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    updatePlugin(plugin.instanceId, (current) =>
                                      current.type === "mangadex-reader"
                                        ? {
                                            ...current,
                                            config: {
                                              ...current.config,
                                              series: [...current.config.series, createMangaSourceDraft()],
                                            },
                                          }
                                        : current,
                                    )
                                  }
                                >
                                  <Plus className="mr-2 size-4" />
                                  Add series
                                </Button>
                              </div>

                              <div className="space-y-3">
                                {plugin.config.series.map((series, seriesIndex) => (
                                  <div
                                    key={series.id}
                                    className="rounded-[1.25rem] border border-border bg-background px-4 py-4"
                                  >
                                    <div className="grid gap-3 md:grid-cols-[1fr_1.2fr_8rem_auto_auto_auto]">
                                      <input
                                        className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                                        type="text"
                                        value={series.label}
                                        onChange={(event) =>
                                          updatePlugin(plugin.instanceId, (current) =>
                                            current.type === "mangadex-reader"
                                              ? {
                                                  ...current,
                                                  config: {
                                                    ...current.config,
                                                    series: current.config.series.map((item) =>
                                                      item.id === series.id
                                                        ? { ...item, label: event.target.value }
                                                        : item,
                                                    ),
                                                  },
                                                }
                                              : current,
                                          )
                                        }
                                      />
                                      <input
                                        className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                                        type="text"
                                        placeholder="MangaDex title URL or ID"
                                        value={series.mangaId}
                                        onChange={(event) =>
                                          updatePlugin(plugin.instanceId, (current) =>
                                            current.type === "mangadex-reader"
                                              ? {
                                                  ...current,
                                                  config: {
                                                    ...current.config,
                                                    series: current.config.series.map((item) =>
                                                      item.id === series.id
                                                        ? { ...item, mangaId: event.target.value }
                                                        : item,
                                                    ),
                                                  },
                                                }
                                              : current,
                                          )
                                        }
                                      />
                                      <input
                                        className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                                        type="text"
                                        value={series.translatedLanguage}
                                        onChange={(event) =>
                                          updatePlugin(plugin.instanceId, (current) =>
                                            current.type === "mangadex-reader"
                                              ? {
                                                  ...current,
                                                  config: {
                                                    ...current.config,
                                                    series: current.config.series.map((item) =>
                                                      item.id === series.id
                                                        ? { ...item, translatedLanguage: event.target.value }
                                                        : item,
                                                    ),
                                                  },
                                                }
                                              : current,
                                          )
                                        }
                                      />
                                      <Button
                                        variant="outline"
                                        disabled={seriesIndex === 0}
                                        onClick={() =>
                                          updatePlugin(plugin.instanceId, (current) =>
                                            current.type === "mangadex-reader"
                                              ? {
                                                  ...current,
                                                  config: {
                                                    ...current.config,
                                                    series: moveArrayItem(
                                                      current.config.series,
                                                      seriesIndex,
                                                      seriesIndex - 1,
                                                    ),
                                                  },
                                                }
                                              : current,
                                          )
                                        }
                                      >
                                        <ArrowUp className="size-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        disabled={seriesIndex >= plugin.config.series.length - 1}
                                        onClick={() =>
                                          updatePlugin(plugin.instanceId, (current) =>
                                            current.type === "mangadex-reader"
                                              ? {
                                                  ...current,
                                                  config: {
                                                    ...current.config,
                                                    series: moveArrayItem(
                                                      current.config.series,
                                                      seriesIndex,
                                                      seriesIndex + 1,
                                                    ),
                                                  },
                                                }
                                              : current,
                                          )
                                        }
                                      >
                                        <ArrowDown className="size-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        disabled={plugin.config.series.length <= 1}
                                        onClick={() =>
                                          updatePlugin(plugin.instanceId, (current) =>
                                            current.type === "mangadex-reader"
                                              ? {
                                                  ...current,
                                                  config: {
                                                    ...current.config,
                                                    series: current.config.series.filter((item) => item.id !== series.id),
                                                  },
                                                }
                                              : current,
                                          )
                                        }
                                      >
                                        <Trash2 className="size-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <p className="text-sm leading-6 text-muted-foreground">
                                This shelf is read in order: one series through its volumes first,
                                then its remaining chapters, before the next one begins.
                              </p>
                            </div>
                          ) : (
                            <div className="mt-5 space-y-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="text-sm font-medium text-foreground">Series order</div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    updatePlugin(plugin.instanceId, (current) =>
                                      current.type === "readcomiconline-reader"
                                        ? {
                                            ...current,
                                            config: {
                                              ...current.config,
                                              series: [...current.config.series, createReadComicsSourceDraft()],
                                            },
                                          }
                                        : current,
                                    )
                                  }
                                >
                                  <Plus className="mr-2 size-4" />
                                  Add series
                                </Button>
                              </div>

                              <div className="space-y-3">
                                {plugin.config.series.map((series, seriesIndex) => (
                                  <div
                                    key={series.id}
                                    className="rounded-[1.25rem] border border-border bg-background px-4 py-4"
                                  >
                                    <div className="grid gap-3 md:grid-cols-[1fr_1.6fr_auto_auto_auto]">
                                      <input
                                        className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                                        type="text"
                                        value={series.label}
                                        onChange={(event) =>
                                          updatePlugin(plugin.instanceId, (current) =>
                                            current.type === "readcomiconline-reader"
                                              ? {
                                                  ...current,
                                                  config: {
                                                    ...current.config,
                                                    series: current.config.series.map((item) =>
                                                      item.id === series.id
                                                        ? { ...item, label: event.target.value }
                                                        : item,
                                                    ),
                                                  },
                                                }
                                              : current,
                                          )
                                        }
                                      />
                                      <input
                                        className="rounded-2xl border border-border bg-background px-4 py-3 text-sm"
                                        type="url"
                                        placeholder="https://readcomiconline.li/Comic/Series-Name"
                                        value={series.seriesUrl}
                                        onChange={(event) =>
                                          updatePlugin(plugin.instanceId, (current) =>
                                            current.type === "readcomiconline-reader"
                                              ? {
                                                  ...current,
                                                  config: {
                                                    ...current.config,
                                                    series: current.config.series.map((item) =>
                                                      item.id === series.id
                                                        ? { ...item, seriesUrl: event.target.value }
                                                        : item,
                                                    ),
                                                  },
                                                }
                                              : current,
                                          )
                                        }
                                      />
                                      <Button
                                        variant="outline"
                                        disabled={seriesIndex === 0}
                                        onClick={() =>
                                          updatePlugin(plugin.instanceId, (current) =>
                                            current.type === "readcomiconline-reader"
                                              ? {
                                                  ...current,
                                                  config: {
                                                    ...current.config,
                                                    series: moveArrayItem(
                                                      current.config.series,
                                                      seriesIndex,
                                                      seriesIndex - 1,
                                                    ),
                                                  },
                                                }
                                              : current,
                                          )
                                        }
                                      >
                                        <ArrowUp className="size-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        disabled={seriesIndex >= plugin.config.series.length - 1}
                                        onClick={() =>
                                          updatePlugin(plugin.instanceId, (current) =>
                                            current.type === "readcomiconline-reader"
                                              ? {
                                                  ...current,
                                                  config: {
                                                    ...current.config,
                                                    series: moveArrayItem(
                                                      current.config.series,
                                                      seriesIndex,
                                                      seriesIndex + 1,
                                                    ),
                                                  },
                                                }
                                              : current,
                                          )
                                        }
                                      >
                                        <ArrowDown className="size-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        disabled={plugin.config.series.length <= 1}
                                        onClick={() =>
                                          updatePlugin(plugin.instanceId, (current) =>
                                            current.type === "readcomiconline-reader"
                                              ? {
                                                  ...current,
                                                  config: {
                                                    ...current.config,
                                                    series: current.config.series.filter((item) => item.id !== series.id),
                                                  },
                                                }
                                              : current,
                                          )
                                        }
                                      >
                                        <Trash2 className="size-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <p className="text-sm leading-6 text-muted-foreground">
                                This shelf moves one chapter at a time, in the exact order you set here.
                              </p>
                            </div>
                          )}
                        </>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default function App() {
  if (!hasClerkConfig) {
    return <MissingClerkConfig />;
  }

  return <AuthenticatedApp />;
}
