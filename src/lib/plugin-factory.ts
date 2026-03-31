import type {
  APHeadlineSource,
  APTopic,
  AlbumSelectionStrategy,
  FeedSelectionStrategy,
  FunnyPagesSource,
  MangaSelectionStrategy,
  MangaSource,
  PluginInstance,
  ReadComicsSource,
  ReadComicsSelectionStrategy,
} from "@/types/app";
import { AP_TOPIC_OPTIONS, DEFAULT_AP_SOURCES } from "@/data/headlines";
import { FUNNY_PAGES_PRESETS } from "@/data/funny-pages";
import { DEFAULT_RSS_SOURCES } from "@/data/rss-feeds";

function createFeedId() {
  return `feed-${crypto.randomUUID()}`;
}

export function createApPlugin(index: number): PluginInstance {
  return {
    instanceId: `ap-headlines-${index}`,
    type: "ap-headlines",
    title: `Headlines ${index}`,
    enabled: true,
    estimatedMinutes: 8,
    config: {
      sources: DEFAULT_AP_SOURCES.map((source) => ({ ...source })),
      storyCount: 4,
    },
  };
}

export function createReutersPlugin(index: number): PluginInstance {
  return {
    instanceId: `reuters-headlines-${index}`,
    type: "reuters-headlines",
    title: `Reuters ${index}`,
    enabled: true,
    estimatedMinutes: 8,
    config: {
      sources: DEFAULT_AP_SOURCES.map((source) => ({ ...source })),
      storyCount: 4,
    },
  };
}

export function createRssPlugin(
  index: number,
  strategy: FeedSelectionStrategy = "best-of-day",
): PluginInstance {
  return {
    instanceId: `rss-reader-${index}`,
    type: "rss-reader",
    title: `Reader ${index}`,
    enabled: true,
    estimatedMinutes: 10,
    config: {
      feeds: DEFAULT_RSS_SOURCES.map((feed) => ({ ...feed })),
      itemsPerDay: 1,
      strategy,
    },
  };
}

export function createAlbumPlugin(
  index: number,
  strategy: AlbumSelectionStrategy = "library-random",
): PluginInstance {
  return {
    instanceId: `album-of-the-day-${index}`,
    type: "album-of-the-day",
    title: `Album ${index}`,
    enabled: true,
    estimatedMinutes: 40,
    config: {
      source: "plex",
      serverUrl: "http://127.0.0.1:32400",
      token: "",
      librarySectionId: "",
      strategy,
    },
  };
}

export function createMangaPlugin(
  index: number,
  strategy: MangaSelectionStrategy = "backlog",
): PluginInstance {
  return {
    instanceId: `manga-reader-${index}`,
    type: "mangadex-reader",
    title: `Manga ${index}`,
    enabled: true,
    estimatedMinutes: 25,
    config: {
      source: "mangadex",
      series: [
        {
          id: `mangadex-series-${index}-1`,
          label: "The Music of Marie",
          mangaId: "1a42a1bc-e0c6-4444-80e1-4650f4e70577",
          translatedLanguage: "en",
        },
      ],
      volumesPerDay: 1,
      strategy,
    },
  };
}

export function createReadComicsPlugin(
  index: number,
  strategy: ReadComicsSelectionStrategy = "backlog",
): PluginInstance {
  return {
    instanceId: `readcomiconline-reader-${index}`,
    type: "readcomiconline-reader",
    title: `Comics ${index}`,
    enabled: true,
    estimatedMinutes: 25,
    config: {
      source: "readcomiconline",
      series: [
        {
          id: `readcomics-series-${index}-1`,
          label: "The Walking Dead",
          seriesUrl: "https://readcomiconline.li/Comic/The-Walking-Dead",
        },
      ],
      chaptersPerDay: 1,
      strategy,
    },
  };
}

export function createFunnyPagesPlugin(index: number): PluginInstance {
  return {
    instanceId: `funny-pages-${index}`,
    type: "funny-pages",
    title: `Funny Pages ${index}`,
    enabled: true,
    estimatedMinutes: 6,
    config: {
      comics: FUNNY_PAGES_PRESETS.slice(0, 3).map((comic) => ({ ...comic })),
    },
  };
}

export function createFeedDraft() {
  return {
    id: createFeedId(),
    label: "New feed",
    url: "https://example.com/feed",
  };
}

export function createHeadlineSourceDraft(topic: APTopic = "politics"): APHeadlineSource {
  const option = AP_TOPIC_OPTIONS.find((entry) => entry.id === topic) ?? AP_TOPIC_OPTIONS[0];

  return {
    id: createFeedId(),
    label: `AP ${option.label}`,
    topic: option.id,
  };
}

export function createFunnyPagesSourceDraft(): FunnyPagesSource {
  return {
    id: createFeedId(),
    label: "New strip",
    provider: "gocomics",
    slug: "",
  };
}

export function createMangaSourceDraft(): MangaSource {
  return {
    id: createFeedId(),
    label: "New series",
    mangaId: "",
    translatedLanguage: "en",
  };
}

export function createReadComicsSourceDraft(): ReadComicsSource {
  return {
    id: createFeedId(),
    label: "New comic",
    seriesUrl: "https://readcomiconline.li/Comic/",
  };
}

export { FUNNY_PAGES_PRESETS };
export { AP_TOPIC_OPTIONS };
