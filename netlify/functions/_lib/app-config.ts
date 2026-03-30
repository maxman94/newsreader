import type {
  APHeadlineSource,
  APTopic,
  AlbumSelectionStrategy,
  ColorScheme,
  FeedSelectionStrategy,
  FontScale,
  FunnyPagesProvider,
  FunnyPagesSource,
  MangaSelectionStrategy,
  PluginInstance,
  RssSource,
  ThemeMode,
  TypographyPreset,
  UserConfig,
  UserPreferences,
} from "../../../src/types/app";
import {
  DEFAULT_FUNNY_PAGES_SOURCES,
  DEFAULT_PREFERENCES,
  DEFAULT_USER_CONFIG,
} from "./constants";

const TOPIC_SET = new Set<APTopic>([
  "politics",
  "world",
  "business",
  "technology",
  "science",
  "health",
  "climate",
  "sports",
  "arts",
  "books",
  "travel",
]);
const THEME_MODES = new Set<ThemeMode>(["light", "dark"]);
const COLOR_SCHEMES = new Set<ColorScheme>([
  "default",
  "sepia",
  "nord",
  "catppuccin",
  "everforest",
  "solarized",
  "gruvbox",
  "rose-pine",
]);
const TYPOGRAPHY_PRESETS = new Set<TypographyPreset>([
  "editorial",
  "modern",
  "bookish",
  "typewritten",
]);
const FONT_SCALES = new Set<FontScale>(["sm", "md", "lg"]);
const FEED_STRATEGIES = new Set<FeedSelectionStrategy>([
  "catch-up",
  "newest",
  "best-of-day",
]);
const ALBUM_STRATEGIES = new Set<AlbumSelectionStrategy>(["library-random", "recently-added"]);
const MANGA_STRATEGIES = new Set<MangaSelectionStrategy>(["backlog"]);

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeHeadlineSources(value: unknown, fallback: APHeadlineSource[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const sources = value
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const candidate = entry as Partial<APHeadlineSource>;
      const topic =
        typeof candidate.topic === "string" && TOPIC_SET.has(candidate.topic as APTopic)
          ? (candidate.topic as APTopic)
          : null;

      if (!topic) {
        return null;
      }

      const label =
        typeof candidate.label === "string" && candidate.label.trim().length > 0
          ? candidate.label.trim()
          : `AP ${topic}`;
      const id =
        typeof candidate.id === "string" && candidate.id.trim().length > 0
          ? slugify(candidate.id)
          : slugify(label || `headline-source-${index + 1}`);

      return {
        id: id || `headline-source-${index + 1}`,
        label,
        topic,
      } satisfies APHeadlineSource;
    })
    .filter((source): source is APHeadlineSource => source !== null)
    .slice(0, 8);

  return sources.length > 0 ? sources : fallback;
}

function topicsToSources(value: unknown, fallback: APHeadlineSource[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const topics = value.filter(
    (entry): entry is APTopic => typeof entry === "string" && TOPIC_SET.has(entry as APTopic),
  );

  if (topics.length === 0) {
    return fallback;
  }

  return topics.map((topic, index) => ({
    id: `ap-${topic}-${index + 1}`,
    label: `AP ${topic.charAt(0).toUpperCase()}${topic.slice(1)}`,
    topic,
  }));
}

function normalizeFeeds(value: unknown, fallback: RssSource[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const feeds = value
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const candidate = entry as Partial<RssSource>;
      const url = typeof candidate.url === "string" ? candidate.url.trim() : "";

      if (!/^https?:\/\//.test(url)) {
        return null;
      }

      const label =
        typeof candidate.label === "string" && candidate.label.trim().length > 0
          ? candidate.label.trim()
          : `Feed ${index + 1}`;
      const id =
        typeof candidate.id === "string" && candidate.id.trim().length > 0
          ? slugify(candidate.id)
          : slugify(label || `feed-${index + 1}`);

      return {
        id: id || `feed-${index + 1}`,
        label,
        url,
      } satisfies RssSource;
    })
    .filter((feed): feed is RssSource => feed !== null);

  return feeds.length > 0 ? feeds : fallback;
}

function normalizeMangaId(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  const uuidPattern =
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
  const match = trimmed.match(uuidPattern);

  return match?.[0].toLowerCase() ?? fallback;
}

function humanizeSlug(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeFunnyPagesSlug(value: unknown, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim().toLowerCase();

  if (!trimmed) {
    return fallback;
  }

  const urlMatch = trimmed.match(/gocomics\.com\/([^/?#]+)/i);
  const raw = (urlMatch?.[1] ?? trimmed).trim();

  return /^[a-z0-9-]+$/.test(raw) ? raw : fallback;
}

function normalizeFunnyPagesUrl(value: unknown, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return /^https?:\/\//.test(trimmed) ? trimmed : fallback;
}

function normalizeFunnyPagesSources(value: unknown, fallback: FunnyPagesSource[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const seen = new Set<string>();
  const comics = value
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const candidate = entry as Partial<FunnyPagesSource>;
      const provider: FunnyPagesProvider =
        candidate.provider === "latest-webcomic" ? "latest-webcomic" : "gocomics";
      const slug = provider === "gocomics" ? normalizeFunnyPagesSlug(candidate.slug, "") : "";
      const url =
        provider === "latest-webcomic"
          ? normalizeFunnyPagesUrl(candidate.url, "")
          : normalizeFunnyPagesUrl(candidate.url, "");
      const dedupeKey = provider === "gocomics" ? `${provider}:${slug}` : `${provider}:${url}`;

      if ((!slug && provider === "gocomics") || (!url && provider === "latest-webcomic") || seen.has(dedupeKey)) {
        return null;
      }

      seen.add(dedupeKey);

      const label =
        typeof candidate.label === "string" && candidate.label.trim().length > 0
          ? candidate.label.trim()
          : provider === "gocomics"
            ? humanizeSlug(slug)
            : `Comic ${index + 1}`;
      const id =
        typeof candidate.id === "string" && candidate.id.trim().length > 0
          ? slugify(candidate.id)
          : slugify(label || slug || `comic-${index + 1}`);

      const normalized: FunnyPagesSource = {
        id: id || `comic-${index + 1}`,
        label,
        provider,
      };

      if (slug) {
        normalized.slug = slug;
      }

      if (url) {
        normalized.url = url;
      }

      return normalized;
    })
    .filter((comic): comic is FunnyPagesSource => comic !== null)
    .slice(0, 10);

  return comics.length > 0 ? comics : fallback;
}

export function normalizePreferences(value: unknown): UserPreferences {
  const input = value && typeof value === "object" ? (value as Partial<UserPreferences>) : {};

  return {
    themeMode: THEME_MODES.has(input.themeMode as ThemeMode)
      ? (input.themeMode as ThemeMode)
      : DEFAULT_PREFERENCES.themeMode,
    colorScheme: COLOR_SCHEMES.has(input.colorScheme as ColorScheme)
      ? (input.colorScheme as ColorScheme)
      : DEFAULT_PREFERENCES.colorScheme,
    typographyPreset: TYPOGRAPHY_PRESETS.has(input.typographyPreset as TypographyPreset)
      ? (input.typographyPreset as TypographyPreset)
      : DEFAULT_PREFERENCES.typographyPreset,
    fontScale: FONT_SCALES.has(input.fontScale as FontScale)
      ? (input.fontScale as FontScale)
      : DEFAULT_PREFERENCES.fontScale,
  };
}

export function normalizeUserConfig(value: unknown): UserConfig {
  const input =
    value && typeof value === "object" && Array.isArray((value as Partial<UserConfig>).plugins)
      ? (value as Partial<UserConfig>)
      : {};

  const plugins = (input.plugins ?? [])
    .map((entry, index) => normalizePlugin(entry, index))
    .filter((plugin): plugin is PluginInstance => plugin !== null);

  return {
    plugins: plugins.length > 0 ? plugins : clone(DEFAULT_USER_CONFIG.plugins),
  };
}

function normalizePlugin(value: unknown, index: number): PluginInstance | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Partial<PluginInstance>;
  const title =
    typeof input.title === "string" && input.title.trim().length > 0
      ? input.title.trim()
      : `Plugin ${index + 1}`;
  const instanceId =
    typeof input.instanceId === "string" && input.instanceId.trim().length > 0
      ? slugify(input.instanceId)
      : `${slugify(title) || "plugin"}-${index + 1}`;

  if (input.type === "ap-headlines") {
    const defaults = DEFAULT_USER_CONFIG.plugins.find(
      (plugin): plugin is Extract<PluginInstance, { type: "ap-headlines" }> =>
        plugin.type === "ap-headlines",
    )!;
    const legacyTopics = (value as { config?: { topics?: unknown } }).config?.topics;

    return {
      instanceId,
      type: "ap-headlines",
      title,
      enabled: input.enabled !== false,
      estimatedMinutes:
        typeof input.estimatedMinutes === "number" && input.estimatedMinutes >= 3
          ? Math.round(input.estimatedMinutes)
          : defaults.estimatedMinutes,
      config: {
        sources: normalizeHeadlineSources(
          input.config?.sources,
          topicsToSources(legacyTopics, defaults.config.sources),
        ),
        storyCount:
          typeof input.config?.storyCount === "number" &&
          input.config.storyCount >= 2 &&
          input.config.storyCount <= 8
            ? Math.round(input.config.storyCount)
            : defaults.config.storyCount,
      },
    };
  }

  if (input.type === "rss-reader") {
    const defaults = DEFAULT_USER_CONFIG.plugins.find(
      (plugin): plugin is Extract<PluginInstance, { type: "rss-reader" }> =>
        plugin.type === "rss-reader",
    )!;
    const strategy = FEED_STRATEGIES.has(input.config?.strategy as FeedSelectionStrategy)
      ? (input.config?.strategy as FeedSelectionStrategy)
      : defaults.config.strategy;

    return {
      instanceId,
      type: "rss-reader",
      title,
      enabled: input.enabled !== false,
      estimatedMinutes:
        typeof input.estimatedMinutes === "number" && input.estimatedMinutes >= 3
          ? Math.round(input.estimatedMinutes)
          : defaults.estimatedMinutes,
      config: {
        feeds: normalizeFeeds(input.config?.feeds, defaults.config.feeds),
        itemsPerDay:
          typeof input.config?.itemsPerDay === "number" &&
          input.config.itemsPerDay >= 1 &&
          input.config.itemsPerDay <= 3
            ? Math.round(input.config.itemsPerDay)
            : defaults.config.itemsPerDay,
        strategy,
      },
    };
  }

  if (input.type === "album-of-the-day") {
    const defaults = DEFAULT_USER_CONFIG.plugins.find(
      (plugin): plugin is Extract<PluginInstance, { type: "album-of-the-day" }> =>
        plugin.type === "album-of-the-day",
    )!;
    const strategy = ALBUM_STRATEGIES.has(input.config?.strategy as AlbumSelectionStrategy)
      ? (input.config?.strategy as AlbumSelectionStrategy)
      : defaults.config.strategy;
    const serverUrl =
      typeof input.config?.serverUrl === "string" && /^https?:\/\//.test(input.config.serverUrl.trim())
        ? input.config.serverUrl.trim().replace(/\/+$/g, "")
        : defaults.config.serverUrl;
    const token = typeof input.config?.token === "string" ? input.config.token.trim() : defaults.config.token;
    const librarySectionId =
      typeof input.config?.librarySectionId === "string"
        ? input.config.librarySectionId.trim()
        : defaults.config.librarySectionId;

    return {
      instanceId,
      type: "album-of-the-day",
      title,
      enabled: input.enabled !== false,
      estimatedMinutes:
        typeof input.estimatedMinutes === "number" && input.estimatedMinutes >= 15
          ? Math.round(input.estimatedMinutes)
          : defaults.estimatedMinutes,
      config: {
        source: "plex",
        serverUrl,
        token,
        librarySectionId,
        strategy,
      },
    };
  }

  if (input.type === "mangadex-reader") {
    const defaults = DEFAULT_USER_CONFIG.plugins.find(
      (plugin): plugin is Extract<PluginInstance, { type: "mangadex-reader" }> =>
        plugin.type === "mangadex-reader",
    )!;
    const strategy = MANGA_STRATEGIES.has(input.config?.strategy as MangaSelectionStrategy)
      ? (input.config?.strategy as MangaSelectionStrategy)
      : defaults.config.strategy;
    const translatedLanguage =
      typeof input.config?.translatedLanguage === "string" &&
      /^[a-z-]{2,8}$/i.test(input.config.translatedLanguage.trim())
        ? input.config.translatedLanguage.trim().toLowerCase()
        : defaults.config.translatedLanguage;

    return {
      instanceId,
      type: "mangadex-reader",
      title,
      enabled: input.enabled !== false,
      estimatedMinutes:
        typeof input.estimatedMinutes === "number" && input.estimatedMinutes >= 10
          ? Math.round(input.estimatedMinutes)
          : defaults.estimatedMinutes,
      config: {
        source: "mangadex",
        mangaId: normalizeMangaId(input.config?.mangaId, defaults.config.mangaId),
        translatedLanguage,
        volumesPerDay: 1,
        strategy,
      },
    };
  }

  if (input.type === "funny-pages") {
    const defaults = DEFAULT_USER_CONFIG.plugins.find(
      (plugin): plugin is Extract<PluginInstance, { type: "funny-pages" }> =>
        plugin.type === "funny-pages",
    ) ?? {
      instanceId: "funny-pages",
      type: "funny-pages" as const,
      title: "Funny Pages",
      enabled: false,
      estimatedMinutes: 6,
      config: {
        comics: DEFAULT_FUNNY_PAGES_SOURCES,
      },
    };

    return {
      instanceId,
      type: "funny-pages",
      title,
      enabled: input.enabled !== false,
      estimatedMinutes:
        typeof input.estimatedMinutes === "number" && input.estimatedMinutes >= 3
          ? Math.round(input.estimatedMinutes)
          : defaults.estimatedMinutes,
      config: {
        comics: normalizeFunnyPagesSources(input.config?.comics, defaults.config.comics),
      },
    };
  }

  return null;
}
