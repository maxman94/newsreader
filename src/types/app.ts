export type APTopic =
  | "politics"
  | "world"
  | "business"
  | "technology"
  | "science"
  | "health"
  | "climate"
  | "sports"
  | "arts"
  | "books"
  | "travel";

export type FeedSelectionStrategy = "catch-up" | "newest" | "best-of-day";

export type AlbumSelectionStrategy = "library-random" | "recently-added";

export type MangaSelectionStrategy = "backlog";

export type ThemeMode = "light" | "dark";

export type ColorScheme =
  | "default"
  | "sepia"
  | "nord"
  | "catppuccin"
  | "everforest"
  | "solarized"
  | "gruvbox"
  | "rose-pine";

export type TypographyPreset = "editorial" | "modern" | "bookish" | "typewritten";

export type FontScale = "sm" | "md" | "lg";

export type PluginType =
  | "ap-headlines"
  | "rss-reader"
  | "album-of-the-day"
  | "mangadex-reader"
  | "funny-pages";

export type RssSource = {
  id: string;
  label: string;
  url: string;
};

export type APHeadlineSource = {
  id: string;
  label: string;
  topic: APTopic;
};

export type FunnyPagesProvider = "gocomics" | "latest-webcomic";

export type FunnyPagesSource = {
  id: string;
  label: string;
  provider: FunnyPagesProvider;
  slug?: string;
  url?: string;
};

export type DigestConfig = {
  date: string;
  headlineCount: number;
  apSources: APHeadlineSource[];
  rssSources: RssSource[];
};

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
};

export type AuthSession = {
  authenticated: true;
  expiresAt?: string;
  user: UserProfile;
};

export type UserPreferences = {
  themeMode: ThemeMode;
  colorScheme: ColorScheme;
  typographyPreset: TypographyPreset;
  fontScale: FontScale;
};

export type StoredAISettings = {
  apiKey: string;
  model: string;
  updatedAt: string;
};

export type AISettings = {
  hasKey: boolean;
  model: string;
  updatedAt?: string;
};

export type APHeadlinesPluginInstance = {
  instanceId: string;
  type: "ap-headlines";
  title: string;
  enabled: boolean;
  estimatedMinutes: number;
  config: {
    sources: APHeadlineSource[];
    storyCount: number;
  };
};

export type RssReaderPluginInstance = {
  instanceId: string;
  type: "rss-reader";
  title: string;
  enabled: boolean;
  estimatedMinutes: number;
  config: {
    feeds: RssSource[];
    itemsPerDay: number;
    strategy: FeedSelectionStrategy;
  };
};

export type AlbumOfTheDayPluginInstance = {
  instanceId: string;
  type: "album-of-the-day";
  title: string;
  enabled: boolean;
  estimatedMinutes: number;
  config: {
    source: "plex";
    serverUrl: string;
    token: string;
    librarySectionId: string;
    strategy: AlbumSelectionStrategy;
  };
};

export type MangaDexReaderPluginInstance = {
  instanceId: string;
  type: "mangadex-reader";
  title: string;
  enabled: boolean;
  estimatedMinutes: number;
  config: {
    source: "mangadex";
    mangaId: string;
    translatedLanguage: string;
    volumesPerDay: number;
    strategy: MangaSelectionStrategy;
  };
};

export type FunnyPagesPluginInstance = {
  instanceId: string;
  type: "funny-pages";
  title: string;
  enabled: boolean;
  estimatedMinutes: number;
  config: {
    comics: FunnyPagesSource[];
  };
};

export type PluginInstance =
  | APHeadlinesPluginInstance
  | RssReaderPluginInstance
  | AlbumOfTheDayPluginInstance
  | MangaDexReaderPluginInstance
  | FunnyPagesPluginInstance;

export type UserConfig = {
  plugins: PluginInstance[];
};

export type DecisionLogEntry = {
  id: string;
  reason: string;
};

export type DecisionLog = {
  pluginInstanceId: string;
  pluginType: PluginType;
  model: string;
  generatedAt: string;
  strategy: "openai" | "fallback";
  selectedIds: string[];
  rationale: string;
  entries: DecisionLogEntry[];
};

export type APStory = {
  id: string;
  title: string;
  url: string;
  topic: APTopic;
  topicLabel: string;
  publishedAt?: string;
  description: string;
  body: string[];
};

export type RssEntry = {
  id: string;
  title: string;
  url: string;
  sourceLabel: string;
  publishedAt?: string;
  description: string;
  body: string[];
  feedId?: string;
};

export type Essay = RssEntry;

export type APStorySelection = Omit<APStory, "body">;

export type RssEntrySelection = Omit<RssEntry, "body">;

export type RssBucketItem = RssEntry & {
  feedId: string;
  addedAt: string;
  sortDate: string;
  servedDate?: string;
};

export type RssPluginBucket = {
  instanceId: string;
  updatedAt: string;
  items: RssBucketItem[];
};

export type AlbumTrack = {
  id: string;
  title: string;
  durationMs?: number;
  discNumber?: number;
  trackNumber?: number;
  partKey?: string;
  trackKey?: string;
};

export type AlbumSelection = {
  id: string;
  title: string;
  artist: string;
  year?: number;
  description: string;
  genres: string[];
  thumbPath?: string;
  addedAt?: string;
  trackCount: number;
  totalDurationMs?: number;
  tracks: AlbumTrack[];
};

export type FunnyPageStrip = {
  id: string;
  sourceId: string;
  label: string;
  slug: string;
  url: string;
  imageUrl: string;
};

export type MangaChapterSelection = {
  id: string;
  title: string;
  chapter?: string;
  volume?: string;
  pages: number;
  publishAt?: string;
};

export type MangaChapter = MangaChapterSelection & {
  imageUrls: string[];
};

export type MangaSelection = {
  mangaId: string;
  sourceUrl: string;
  title: string;
  author?: string;
  year?: number;
  status?: string;
  description: string;
  translatedLanguage: string;
  chapters: MangaChapter[];
};

export type PersistedMangaSelection = Omit<MangaSelection, "chapters"> & {
  chapters: MangaChapterSelection[];
};

export type MangaQueueItem = MangaChapterSelection & {
  sortKey: string;
  addedAt: string;
  servedDate?: string;
};

export type MangaPluginQueue = {
  instanceId: string;
  mangaId: string;
  translatedLanguage: string;
  updatedAt: string;
  items: MangaQueueItem[];
};

export type DigestPage =
  | {
      id: string;
      pluginInstanceId: string;
      pluginType: "ap-headlines";
      title: string;
      estimatedMinutes: number;
      stories: APStory[];
    }
  | {
      id: string;
      pluginInstanceId: string;
      pluginType: "rss-reader";
      title: string;
      estimatedMinutes: number;
      items: RssEntry[];
      strategy: FeedSelectionStrategy;
    }
  | {
      id: string;
      pluginInstanceId: string;
      pluginType: "album-of-the-day";
      title: string;
      estimatedMinutes: number;
      album: AlbumSelection;
      strategy: AlbumSelectionStrategy;
    }
  | {
      id: string;
      pluginInstanceId: string;
      pluginType: "mangadex-reader";
      title: string;
      estimatedMinutes: number;
      manga: MangaSelection;
      strategy: MangaSelectionStrategy;
    }
  | {
      id: string;
      pluginInstanceId: string;
      pluginType: "funny-pages";
      title: string;
      estimatedMinutes: number;
      strips: FunnyPageStrip[];
    };

export type PersistedDigestPage =
  | {
      id: string;
      pluginInstanceId: string;
      pluginType: "ap-headlines";
      title: string;
      estimatedMinutes: number;
      stories: APStorySelection[];
    }
  | {
      id: string;
      pluginInstanceId: string;
      pluginType: "rss-reader";
      title: string;
      estimatedMinutes: number;
      items: RssEntrySelection[];
      strategy: FeedSelectionStrategy;
    }
  | {
      id: string;
      pluginInstanceId: string;
      pluginType: "album-of-the-day";
      title: string;
      estimatedMinutes: number;
      album: AlbumSelection;
      strategy: AlbumSelectionStrategy;
    }
  | {
      id: string;
      pluginInstanceId: string;
      pluginType: "mangadex-reader";
      title: string;
      estimatedMinutes: number;
      manga: PersistedMangaSelection;
      strategy: MangaSelectionStrategy;
    }
  | {
      id: string;
      pluginInstanceId: string;
      pluginType: "funny-pages";
      title: string;
      estimatedMinutes: number;
      strips: FunnyPageStrip[];
    };

export type PersistedDigest = {
  id: string;
  date: string;
  configSnapshot: UserConfig;
  pages: PersistedDigestPage[];
  decisionLogs: DecisionLog[];
  generatedAt: string;
};

export type StoredDigest = {
  id: string;
  date: string;
  configSnapshot: UserConfig;
  pages: DigestPage[];
  decisionLogs: DecisionLog[];
  generatedAt: string;
};

export type CompletionState = {
  completed: boolean;
  completedAt?: string;
};

export type CompletionRecord = {
  date: string;
  plugins: Record<string, CompletionState>;
  updatedAt: string;
};

export type HabitStatus = "complete" | "incomplete" | "missing";

export type HabitsRow = {
  pluginInstanceId: string;
  title: string;
  pluginType: PluginType;
  days: Array<{
    date: string;
    status: HabitStatus;
  }>;
};

export type AppBootstrapResponse = {
  session: AuthSession | null;
  preferences: UserPreferences | null;
  config: UserConfig | null;
  aiSettings: AISettings | null;
  archiveDates: string[];
};

export type PreferencesResponse = {
  preferences: UserPreferences;
};

export type ConfigResponse = {
  config: UserConfig;
};

export type DigestResponse = {
  digest: StoredDigest;
  completion: CompletionRecord;
  fromCache: boolean;
  storage: "blobs" | "memory";
};

export type CompletionResponse = {
  completion: CompletionRecord;
};

export type HabitsResponse = {
  days: string[];
  rows: HabitsRow[];
};

export type AISettingsResponse = {
  settings: AISettings;
};

export type GenerateDigestRequest = Partial<DigestConfig>;

export type GenerateDigestResponse = {
  digest: StoredDigest;
  fromCache: boolean;
  storage: "blobs" | "memory";
};
