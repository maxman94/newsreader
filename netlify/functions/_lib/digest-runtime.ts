import type {
  APStory,
  APStorySelection,
  AlbumSelection,
  ComicChapterSelection,
  ComicPluginQueue,
  DecisionLog,
  DigestPage,
  FeedSelectionStrategy,
  FunnyPageStrip,
  MangaChapterSelection,
  MangaPluginQueue,
  PersistedMangaSelection,
  PersistedDigest,
  PersistedDigestPage,
  PluginInstance,
  RssBucketItem,
  RssEntry,
  RssEntrySelection,
  RssPluginBucket,
  StoredAISettings,
  StoredDigest,
  UserConfig,
} from "../../../src/types/app";
import { getAPCandidates, hydrateAPStories } from "./ap";
import {
  loadBucket,
  loadComicQueue,
  loadMangaQueue,
  saveBucket,
  saveComicQueue,
  saveMangaQueue,
} from "./app-storage";
import { createConfigHash } from "./hash";
import { getFunnyPageStrips } from "./funny-pages";
import {
  getMangaDexChapters,
  getMangaDexMetadata,
  hydrateMangaSelection,
  mergeMangaQueueItems,
} from "./mangadex";
import {
  getReadComicsChapters,
  getReadComicsMetadata,
  hydrateReadComicsSelection,
  mergeComicQueueItems,
} from "./readcomiconline";
import { getReutersCandidates, hydrateReutersStories } from "./reuters";
import { selectAPStories, selectRssEntries } from "./openai";
import { selectPlexAlbum } from "./plex";
import { getEssayCandidates, hydrateRssEntries } from "./rss";

const MAX_BUCKET_ITEMS = 200;

function normalizeSortDate(value?: string) {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

function estimateMinutesFromText(blocks: string[]) {
  const words = blocks.join(" ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.ceil(words / 220));
}

function toStoredAPStory(story: APStory): APStorySelection {
  return {
    id: story.id,
    title: story.title,
    url: story.url,
    topic: story.topic,
    topicLabel: story.topicLabel,
    publishedAt: story.publishedAt,
    description: story.description,
  };
}

function toStoredRssEntry(entry: RssEntry): RssEntrySelection {
  return {
    id: entry.id,
    title: entry.title,
    url: entry.url,
    sourceLabel: entry.sourceLabel,
    publishedAt: entry.publishedAt,
    description: entry.description,
    feedId: entry.feedId,
  };
}

function toStoredMangaChapter(entry: MangaChapterSelection): MangaChapterSelection {
  return {
    id: entry.id,
    title: entry.title,
    chapter: entry.chapter,
    volume: entry.volume,
    pages: entry.pages,
    publishAt: entry.publishAt,
  };
}

function toStoredComicChapter(entry: ComicChapterSelection): ComicChapterSelection {
  return {
    id: entry.id,
    title: entry.title,
    issue: entry.issue,
    publishAt: entry.publishAt,
    pages: entry.pages,
    sourceUrl: entry.sourceUrl,
  };
}

function createAlbumDecisionLog(
  pluginInstanceId: string,
  strategy: string,
  album: AlbumSelection,
): DecisionLog {
  return {
    pluginInstanceId,
    pluginType: "album-of-the-day",
    model: `policy:${strategy}`,
    generatedAt: new Date().toISOString(),
    strategy: "fallback",
    selectedIds: [album.id],
    rationale:
      strategy === "recently-added"
        ? "Selected the most recently added album from the configured Plex music library."
        : "Selected a deterministic rotating album from the configured Plex music library.",
    entries: [
      {
        id: album.id,
        reason:
          strategy === "recently-added"
            ? "Chosen as the newest album in the configured Plex library."
            : "Chosen by the daily rotating library-random policy.",
      },
    ],
  };
}

function createPolicyDecisionLog(
  pluginInstanceId: string,
  strategyName: FeedSelectionStrategy,
  items: RssEntry[],
  rationale: string,
): DecisionLog {
  return {
    pluginInstanceId,
    pluginType: "rss-reader",
    model: `policy:${strategyName}`,
    generatedAt: new Date().toISOString(),
    strategy: "fallback",
    selectedIds: items.map((item) => item.id),
    rationale,
    entries: items.map((item) => ({
      id: item.id,
      reason: `Selected by the ${strategyName} policy.`,
    })),
  };
}

function createMangaDecisionLog(
  pluginInstanceId: string,
  items: MangaChapterSelection[],
  sourceLabel: string,
): DecisionLog {
  const volume = items[0]?.volume?.trim();
  const isVolume = Boolean(volume);

  return {
    pluginInstanceId,
    pluginType: "mangadex-reader",
    model: "policy:backlog",
    generatedAt: new Date().toISOString(),
    strategy: "fallback",
    selectedIds: items.map((item) => item.id),
    rationale: isVolume
      ? `Selected the next unread volume from ${sourceLabel}, taking the full volume together.`
      : `Selected the next unread non-volume chapter set from ${sourceLabel} after the numbered volumes.`,
    entries: items.map((item) => ({
      id: item.id,
      reason: isVolume
        ? `Chosen as part of the next unread volume ${item.volume ?? "?"}.`
        : "Chosen from the next unread non-volume chapter set.",
    })),
  };
}

function createReadComicsDecisionLog(
  pluginInstanceId: string,
  items: ComicChapterSelection[],
  sourceLabel: string,
): DecisionLog {
  return {
    pluginInstanceId,
    pluginType: "readcomiconline-reader",
    model: "policy:backlog",
    generatedAt: new Date().toISOString(),
    strategy: "fallback",
    selectedIds: items.map((item) => item.id),
    rationale: `Selected the next unread chapter from ${sourceLabel} in backlog order.`,
    entries: items.map((item) => ({
      id: item.id,
      reason: `Chosen as the next unread chapter: ${item.title}.`,
    })),
  };
}

function createFunnyPagesDecisionLog(
  pluginInstanceId: string,
  strips: FunnyPageStrip[],
): DecisionLog {
  return {
    pluginInstanceId,
    pluginType: "funny-pages",
    model: "policy:gocomics-daily",
    generatedAt: new Date().toISOString(),
    strategy: "fallback",
    selectedIds: strips.map((strip) => strip.id),
    rationale: "Selected one daily strip from each configured funny-pages source.",
    entries: strips.map((strip) => ({
      id: strip.id,
      reason: `Included today's strip from ${strip.label}.`,
    })),
  };
}

function mergeBucketItems(bucket: RssPluginBucket, entries: RssEntry[]) {
  const now = new Date().toISOString();
  const map = new Map<string, RssBucketItem>(bucket.items.map((item) => [item.id, item]));

  for (const entry of entries) {
    const existing = map.get(entry.id);

    map.set(entry.id, {
      ...existing,
      ...entry,
      feedId: entry.feedId ?? existing?.feedId ?? "feed",
      addedAt: existing?.addedAt ?? now,
      servedDate: existing?.servedDate,
      sortDate: existing?.sortDate ?? normalizeSortDate(entry.publishedAt),
    });
  }

  return {
    ...bucket,
    updatedAt: now,
    items: [...map.values()]
      .sort((left, right) => right.sortDate.localeCompare(left.sortDate))
      .slice(0, MAX_BUCKET_ITEMS),
  } satisfies RssPluginBucket;
}

async function selectRssPage(
  userId: string,
  date: string,
  plugin: Extract<PluginInstance, { type: "rss-reader" }>,
  aiSettings: StoredAISettings,
) {
  const currentBucket = await loadBucket(userId, plugin.instanceId);
  const fetched = await getEssayCandidates(plugin.config.feeds);
  const mergedBucket = mergeBucketItems(currentBucket, fetched);
  const available = mergedBucket.items.filter((item) => !item.servedDate);

  if (available.length === 0) {
    throw new Error(`No RSS entries available for plugin ${plugin.title}.`);
  }

  let items: RssEntry[];
  let decisionLog: DecisionLog;

  if (plugin.config.strategy === "catch-up") {
    items = [...available]
      .sort((left, right) => left.sortDate.localeCompare(right.sortDate))
      .slice(0, plugin.config.itemsPerDay);
    decisionLog = createPolicyDecisionLog(
      plugin.instanceId,
      "catch-up",
      items,
      "Selected oldest unread feed entries first to work through the backlog in order.",
    );
  } else if (plugin.config.strategy === "newest") {
    items = [...available]
      .sort((left, right) => right.sortDate.localeCompare(left.sortDate))
      .slice(0, plugin.config.itemsPerDay);
    decisionLog = createPolicyDecisionLog(
      plugin.instanceId,
      "newest",
      items,
      "Selected the newest unread feed entries first.",
    );
  } else {
    const candidatePool = [...available]
      .sort((left, right) => right.sortDate.localeCompare(left.sortDate))
      .slice(0, 12);
    const result = await selectRssEntries(
      candidatePool,
      plugin.config.itemsPerDay,
      date,
      plugin.instanceId,
      plugin.title,
      aiSettings,
    );

    items = result.items;
    decisionLog = result.decisionLog;
  }

  const selectedIds = new Set(items.map((item) => item.id));
  const updatedBucket: RssPluginBucket = {
    ...mergedBucket,
    updatedAt: new Date().toISOString(),
    items: mergedBucket.items.map((item) =>
      selectedIds.has(item.id)
        ? {
            ...item,
            servedDate: item.servedDate ?? date,
          }
        : item,
    ),
  };

  await saveBucket(userId, updatedBucket);

  const page: PersistedDigestPage = {
    id: `${plugin.instanceId}-${date}`,
    pluginInstanceId: plugin.instanceId,
    pluginType: "rss-reader",
    title: plugin.title,
    estimatedMinutes: estimateMinutesFromText(items.flatMap((item) => item.body)),
    items: items.map((item) => toStoredRssEntry(item)),
    strategy: plugin.config.strategy,
  };

  return { page, decisionLog };
}

async function selectHeadlinePage(
  date: string,
  plugin: Extract<PluginInstance, { type: "ap-headlines" | "reuters-headlines" }>,
  aiSettings: StoredAISettings,
  getCandidates: () => Promise<APStory[]>,
) {
  const candidates = await getCandidates();

  if (candidates.length === 0) {
    throw new Error(`No headline candidates available for plugin ${plugin.title}.`);
  }

  const result = await selectAPStories(
    candidates,
    plugin.config.storyCount,
    date,
    plugin.instanceId,
    plugin.type,
    aiSettings,
  );

  const page: PersistedDigestPage = {
    id: `${plugin.instanceId}-${date}`,
    pluginInstanceId: plugin.instanceId,
    pluginType: plugin.type,
    title: plugin.title,
    estimatedMinutes: Math.max(
      plugin.estimatedMinutes,
      estimateMinutesFromText(result.stories.flatMap((story) => story.body)),
    ),
    stories: result.stories.map((story) => toStoredAPStory(story)),
  };

  return { page, decisionLog: result.decisionLog };
}

async function selectAPPage(
  date: string,
  plugin: Extract<PluginInstance, { type: "ap-headlines" }>,
  aiSettings: StoredAISettings,
) {
  return selectHeadlinePage(date, plugin, aiSettings, () => getAPCandidates(plugin.config.sources));
}

async function selectReutersPage(
  date: string,
  plugin: Extract<PluginInstance, { type: "reuters-headlines" }>,
  aiSettings: StoredAISettings,
) {
  return selectHeadlinePage(date, plugin, aiSettings, () =>
    getReutersCandidates(plugin.config.sources),
  );
}

async function selectAlbumPage(
  date: string,
  plugin: Extract<PluginInstance, { type: "album-of-the-day" }>,
) {
  const album = await selectPlexAlbum(
    plugin.config.serverUrl,
    plugin.config.token,
    plugin.config.librarySectionId,
    plugin.config.strategy,
    date,
    plugin.instanceId,
  );

  const totalDurationMs =
    album.totalDurationMs ?? album.tracks.reduce((total, track) => total + (track.durationMs ?? 0), 0);
  const estimatedMinutes = Math.max(
    plugin.estimatedMinutes,
    totalDurationMs > 0 ? Math.ceil(totalDurationMs / 60000) : plugin.estimatedMinutes,
  );

  const page: PersistedDigestPage = {
    id: `${plugin.instanceId}-${date}`,
    pluginInstanceId: plugin.instanceId,
    pluginType: "album-of-the-day",
    title: plugin.title,
    estimatedMinutes,
    album,
    strategy: plugin.config.strategy,
  };

  return {
    page,
    decisionLog: createAlbumDecisionLog(plugin.instanceId, plugin.config.strategy, album),
  };
}

function estimateMinutesFromPages(pageCount: number) {
  return Math.max(10, Math.ceil(pageCount / 2));
}

function parseNumericVolume(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function replaceQueueItemsForSource<
  T extends { sourceId: string },
>(items: T[], sourceId: string, nextItems: T[]) {
  return [...items.filter((item) => item.sourceId !== sourceId), ...nextItems];
}

function buildMangaUnits(items: MangaPluginQueue["items"]) {
  const numberedVolumes = new Map<string, MangaPluginQueue["items"]>();
  const nonVolumeChapters: MangaPluginQueue["items"] = [];

  for (const item of [...items].sort((left, right) => left.sortKey.localeCompare(right.sortKey))) {
    const volume = item.volume?.trim();
    const numericVolume = parseNumericVolume(volume);

    if (volume && numericVolume !== null) {
      const group = numberedVolumes.get(volume) ?? [];
      group.push(item);
      numberedVolumes.set(volume, group);
      continue;
    }

    nonVolumeChapters.push(item);
  }

  const volumeUnits = [...numberedVolumes.entries()]
    .sort((left, right) => {
      const leftValue = parseNumericVolume(left[0]) ?? Number.POSITIVE_INFINITY;
      const rightValue = parseNumericVolume(right[0]) ?? Number.POSITIVE_INFINITY;

      if (leftValue !== rightValue) {
        return leftValue - rightValue;
      }

      return left[0].localeCompare(right[0]);
    })
    .map(([, group]) => group);

  return [...volumeUnits, ...nonVolumeChapters.map((chapter) => [chapter])];
}

async function selectMangaPage(
  userId: string,
  date: string,
  plugin: Extract<PluginInstance, { type: "mangadex-reader" }>,
) {
  const currentQueue = await loadMangaQueue(userId, plugin.instanceId);
  const configuredSourceIds = new Set(plugin.config.series.map((source) => source.id));
  let queueItems = currentQueue.items.filter((item) => configuredSourceIds.has(item.sourceId));
  let selected = null as MangaPluginQueue["items"] | null;
  let selectedSource = null as Extract<typeof plugin.config.series[number], object> | null;
  let metadata = null as Awaited<ReturnType<typeof getMangaDexMetadata>> | null;

  for (const source of plugin.config.series) {
    const existingItems = queueItems.filter((item) => item.sourceId === source.id);
    const fetchedChapters = await getMangaDexChapters(source.mangaId, source.translatedLanguage);
    const mergedSeriesItems = mergeMangaQueueItems(existingItems, fetchedChapters, source);

    queueItems = replaceQueueItemsForSource(queueItems, source.id, mergedSeriesItems);

    const availableUnits = buildMangaUnits(mergedSeriesItems.filter((item) => !item.servedDate));

    if (availableUnits.length > 0) {
      selected = availableUnits[0];
      selectedSource = source;
      metadata = await getMangaDexMetadata(source.mangaId, source.translatedLanguage);
      break;
    }
  }

  if (!selected || !selectedSource || !metadata) {
    throw new Error(`No unread MangaDex chapters available for plugin ${plugin.title}.`);
  }

  const selectedIds = new Set(selected.map((item) => item.id));
  const queue: MangaPluginQueue = {
    ...currentQueue,
    updatedAt: new Date().toISOString(),
    items: queueItems.map((item) =>
      selectedIds.has(item.id)
        ? {
            ...item,
            servedDate: item.servedDate ?? date,
          }
        : item,
    ),
  };

  await saveMangaQueue(userId, queue);

  const pageCount = selected.reduce((total, chapter) => total + Math.max(0, chapter.pages), 0);
  const manga: PersistedMangaSelection = {
    sourceId: selectedSource.id,
    sourceLabel: selectedSource.label,
    ...metadata,
    translatedLanguage: selectedSource.translatedLanguage,
    chapters: selected.map((chapter) => toStoredMangaChapter(chapter)),
  };
  const page: PersistedDigestPage = {
    id: `${plugin.instanceId}-${date}`,
    pluginInstanceId: plugin.instanceId,
    pluginType: "mangadex-reader",
    title: plugin.title,
    estimatedMinutes: Math.max(plugin.estimatedMinutes, estimateMinutesFromPages(pageCount)),
    manga,
    strategy: plugin.config.strategy,
  };

  return {
    page,
    decisionLog: createMangaDecisionLog(plugin.instanceId, selected, selectedSource.label),
  };
}

async function selectReadComicsPage(
  userId: string,
  date: string,
  plugin: Extract<PluginInstance, { type: "readcomiconline-reader" }>,
) {
  const currentQueue = await loadComicQueue(userId, plugin.instanceId);
  const configuredSourceIds = new Set(plugin.config.series.map((source) => source.id));
  let queueItems = currentQueue.items.filter((item) => configuredSourceIds.has(item.sourceId));
  let selected = null as ComicPluginQueue["items"] | null;
  let selectedSource = null as Extract<typeof plugin.config.series[number], object> | null;
  let metadata = null as Awaited<ReturnType<typeof getReadComicsMetadata>> | null;

  for (const source of plugin.config.series) {
    const existingItems = queueItems.filter((item) => item.sourceId === source.id);
    const fetchedChapters = await getReadComicsChapters(source);
    const mergedSeriesItems = mergeComicQueueItems(existingItems, fetchedChapters, source);

    queueItems = replaceQueueItemsForSource(queueItems, source.id, mergedSeriesItems);

    const available = mergedSeriesItems.filter((item) => !item.servedDate);

    if (available.length > 0) {
      selected = [available[0]];
      selectedSource = source;
      metadata = await getReadComicsMetadata(source.seriesUrl);
      break;
    }
  }

  if (!selected || !selectedSource || !metadata) {
    throw new Error(`No unread ReadComicsOnline chapters available for plugin ${plugin.title}.`);
  }

  const selectedIds = new Set(selected.map((item) => item.id));
  const queue: ComicPluginQueue = {
    ...currentQueue,
    updatedAt: new Date().toISOString(),
    items: queueItems.map((item) =>
      selectedIds.has(item.id)
        ? {
            ...item,
            servedDate: item.servedDate ?? date,
          }
        : item,
    ),
  };

  await saveComicQueue(userId, queue);

  const comic = {
    sourceId: selectedSource.id,
    sourceLabel: selectedSource.label,
    seriesUrl: metadata.seriesUrl,
    title: metadata.title,
    description: metadata.description,
    chapters: selected.map((chapter) => toStoredComicChapter(chapter)),
  };
  const page: PersistedDigestPage = {
    id: `${plugin.instanceId}-${date}`,
    pluginInstanceId: plugin.instanceId,
    pluginType: "readcomiconline-reader",
    title: plugin.title,
    estimatedMinutes: plugin.estimatedMinutes,
    comic,
    strategy: plugin.config.strategy,
  };

  return {
    page,
    decisionLog: createReadComicsDecisionLog(plugin.instanceId, selected, selectedSource.label),
  };
}

async function selectFunnyPagesPage(
  date: string,
  plugin: Extract<PluginInstance, { type: "funny-pages" }>,
) {
  const strips = await getFunnyPageStrips(plugin.config.comics, date);

  if (strips.length === 0) {
    throw new Error(`No funny pages were available for plugin ${plugin.title}.`);
  }

  const page: PersistedDigestPage = {
    id: `${plugin.instanceId}-${date}`,
    pluginInstanceId: plugin.instanceId,
    pluginType: "funny-pages",
    title: plugin.title,
    estimatedMinutes: Math.max(plugin.estimatedMinutes, Math.ceil(strips.length * 2)),
    strips,
  };

  return {
    page,
    decisionLog: createFunnyPagesDecisionLog(plugin.instanceId, strips),
  };
}

export async function hydrateDigest(storedDigest: PersistedDigest): Promise<StoredDigest> {
  const pages = await Promise.all(
    storedDigest.pages.map(async (page): Promise<DigestPage> => {
      if (page.pluginType === "ap-headlines") {
        return {
          ...page,
          stories: await hydrateAPStories(page.stories),
        };
      }

      if (page.pluginType === "reuters-headlines") {
        return {
          ...page,
          stories: await hydrateReutersStories(page.stories),
        };
      }

      if (page.pluginType === "album-of-the-day") {
        return page;
      }

      if (page.pluginType === "mangadex-reader") {
        return {
          ...page,
          manga: await hydrateMangaSelection(page.manga),
        };
      }

      if (page.pluginType === "readcomiconline-reader") {
        return {
          ...page,
          comic: await hydrateReadComicsSelection(page.comic),
        };
      }

      if (page.pluginType === "funny-pages") {
        return page;
      }

      return {
        ...page,
        items: await hydrateRssEntries(page.items),
      };
    }),
  );

  return {
    ...storedDigest,
    pages,
  };
}

export async function buildDigestForUser(
  userId: string,
  date: string,
  config: UserConfig,
  aiSettings: StoredAISettings,
): Promise<PersistedDigest> {
  const pages: PersistedDigestPage[] = [];
  const decisionLogs: DecisionLog[] = [];
  const builders: {
    [K in PluginInstance["type"]]: (
      plugin: Extract<PluginInstance, { type: K }>,
    ) => Promise<{ page: PersistedDigestPage; decisionLog: DecisionLog }>;
  } = {
    "ap-headlines": (plugin) => selectAPPage(date, plugin, aiSettings),
    "reuters-headlines": (plugin) => selectReutersPage(date, plugin, aiSettings),
    "rss-reader": (plugin) => selectRssPage(userId, date, plugin, aiSettings),
    "album-of-the-day": (plugin) => selectAlbumPage(date, plugin),
    "mangadex-reader": (plugin) => selectMangaPage(userId, date, plugin),
    "readcomiconline-reader": (plugin) => selectReadComicsPage(userId, date, plugin),
    "funny-pages": (plugin) => selectFunnyPagesPage(date, plugin),
  };

  for (const plugin of config.plugins.filter((entry) => entry.enabled)) {
    try {
      const result = await builders[plugin.type](plugin as never);
      pages.push(result.page);
      decisionLogs.push(result.decisionLog);
    } catch (error) {
      console.error(`Failed to render plugin ${plugin.instanceId}`, error);
    }
  }

  if (pages.length === 0) {
    throw new Error("No digest pages could be generated for the current configuration.");
  }

  return {
    id: `digest-${date}-${createConfigHash(config)}`,
    date,
    configSnapshot: config,
    pages,
    decisionLogs,
    generatedAt: new Date().toISOString(),
  } satisfies PersistedDigest;
}
