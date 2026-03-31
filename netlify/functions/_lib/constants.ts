import type {
  AlbumSelectionStrategy,
  DigestConfig,
  FunnyPagesSource,
  MangaSelectionStrategy,
  UserConfig,
  UserPreferences,
} from "../../../src/types/app";
import { DEFAULT_AP_SOURCES } from "../../../src/data/headlines";
import { FUNNY_PAGES_PRESETS } from "../../../src/data/funny-pages";
import { DEFAULT_RSS_SOURCES } from "../../../src/data/rss-feeds";

export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

export const DEFAULT_DIGEST_CONFIG: DigestConfig = {
  date: new Date().toISOString().slice(0, 10),
  headlineCount: 4,
  apSources: DEFAULT_AP_SOURCES,
  rssSources: DEFAULT_RSS_SOURCES,
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  themeMode: "light",
  colorScheme: "default",
  typographyPreset: "editorial",
  fontScale: "md",
};

export const DEFAULT_ALBUM_SELECTION_STRATEGY: AlbumSelectionStrategy = "library-random";
export const DEFAULT_MANGA_SELECTION_STRATEGY: MangaSelectionStrategy = "backlog";
export const DEFAULT_FUNNY_PAGES_SOURCES: FunnyPagesSource[] = FUNNY_PAGES_PRESETS.slice(0, 3).map(
  (comic) => ({ ...comic }),
);

export const DEFAULT_USER_CONFIG: UserConfig = {
  plugins: [
    {
      instanceId: "ap-front-page",
      type: "ap-headlines",
      title: "AP Front Page",
      enabled: true,
      estimatedMinutes: 8,
      config: {
        sources: DEFAULT_AP_SOURCES,
        storyCount: 4,
      },
    },
    {
      instanceId: "reuters-front-page",
      type: "reuters-headlines",
      title: "Reuters Front Page",
      enabled: false,
      estimatedMinutes: 8,
      config: {
        sources: DEFAULT_AP_SOURCES,
        storyCount: 4,
      },
    },
    {
      instanceId: "rss-essay",
      type: "rss-reader",
      title: "Reader",
      enabled: true,
      estimatedMinutes: 10,
      config: {
        feeds: DEFAULT_RSS_SOURCES,
        itemsPerDay: 1,
        strategy: "best-of-day",
      },
    },
    {
      instanceId: "album-of-the-day",
      type: "album-of-the-day",
      title: "Album of the Day",
      enabled: false,
      estimatedMinutes: 40,
      config: {
        source: "plex",
        serverUrl: "http://127.0.0.1:32400",
        token: "",
        librarySectionId: "",
        strategy: DEFAULT_ALBUM_SELECTION_STRATEGY,
      },
    },
    {
      instanceId: "manga-reader",
      type: "mangadex-reader",
      title: "Manga",
      enabled: false,
      estimatedMinutes: 25,
      config: {
        source: "mangadex",
        series: [
          {
            id: "mangadex-series-1",
            label: "The Music of Marie",
            mangaId: "1a42a1bc-e0c6-4444-80e1-4650f4e70577",
            translatedLanguage: "en",
          },
        ],
        volumesPerDay: 1,
        strategy: DEFAULT_MANGA_SELECTION_STRATEGY,
      },
    },
    {
      instanceId: "comics-reader",
      type: "readcomiconline-reader",
      title: "Comics",
      enabled: false,
      estimatedMinutes: 25,
      config: {
        source: "readcomiconline",
        series: [
          {
            id: "readcomics-series-1",
            label: "The Walking Dead",
            seriesUrl: "https://readcomiconline.li/Comic/The-Walking-Dead",
          },
        ],
        chaptersPerDay: 1,
        strategy: "backlog",
      },
    },
    {
      instanceId: "funny-pages",
      type: "funny-pages",
      title: "Funny Pages",
      enabled: false,
      estimatedMinutes: 6,
      config: {
        comics: DEFAULT_FUNNY_PAGES_SOURCES,
      },
    },
  ],
};
