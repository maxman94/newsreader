import type {
  APStory,
  APStorySelection,
  AlbumSelection,
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
import { loadBucket, loadMangaQueue, saveBucket, saveMangaQueue } from "./app-storage";
import { createConfigHash } from "./hash";
import { getFunnyPageStrips } from "./funny-pages";
import {
  getMangaDexChapters,
  getMangaDexMetadata,
  hydrateMangaSelection,
  mergeMangaQueueItems,
} from "./mangadex";
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
): DecisionLog {
  const volume = items[0]?.volume ?? "?";

  return {
    pluginInstanceId,
    pluginType: "mangadex-reader",
    model: "policy:backlog",
    generatedAt: new Date().toISOString(),
    strategy: "fallback",
    selectedIds: items.map((item) => item.id),
    rationale:
      `Selected the next unread MangaDex volume, taking all unread chapters from volume ${volume}.`,
    entries: items.map((item) => ({
      id: item.id,
      reason: `Chosen as part of the next unread volume ${item.volume ?? "?"}.`,
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

async function selectAPPage(
  date: string,
  plugin: Extract<PluginInstance, { type: "ap-headlines" }>,
  aiSettings: StoredAISettings,
) {
  const candidates = await getAPCandidates(plugin.config.sources);

  if (candidates.length === 0) {
    throw new Error(`No AP candidates available for plugin ${plugin.title}.`);
  }

  const result = await selectAPStories(
    candidates,
    plugin.config.storyCount,
    date,
    plugin.instanceId,
    aiSettings,
  );

  const page: PersistedDigestPage = {
    id: `${plugin.instanceId}-${date}`,
    pluginInstanceId: plugin.instanceId,
    pluginType: "ap-headlines",
    title: plugin.title,
    estimatedMinutes: Math.max(
      plugin.estimatedMinutes,
      estimateMinutesFromText(result.stories.flatMap((story) => story.body)),
    ),
    stories: result.stories.map((story) => toStoredAPStory(story)),
  };

  return { page, decisionLog: result.decisionLog };
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

function mangaVolumeKey(item: MangaChapterSelection) {
  return item.volume?.trim() || "oneshot";
}

async function selectMangaPage(
  userId: string,
  date: string,
  plugin: Extract<PluginInstance, { type: "mangadex-reader" }>,
) {
  const currentQueue = await loadMangaQueue(
    userId,
    plugin.instanceId,
    plugin.config.mangaId,
    plugin.config.translatedLanguage,
  );
  const [metadata, fetchedChapters] = await Promise.all([
    getMangaDexMetadata(plugin.config.mangaId, plugin.config.translatedLanguage),
    getMangaDexChapters(plugin.config.mangaId, plugin.config.translatedLanguage),
  ]);
  const mergedItems = mergeMangaQueueItems(currentQueue.items, fetchedChapters);
  const available = mergedItems.filter((item) => !item.servedDate);

  if (available.length === 0) {
    throw new Error(`No unread MangaDex chapters available for plugin ${plugin.title}.`);
  }

  const nextVolume = mangaVolumeKey(available[0]);
  const selected = available.filter((item) => mangaVolumeKey(item) === nextVolume);
  const selectedIds = new Set(selected.map((item) => item.id));
  const queue: MangaPluginQueue = {
    ...currentQueue,
    mangaId: plugin.config.mangaId,
    translatedLanguage: plugin.config.translatedLanguage,
    updatedAt: new Date().toISOString(),
    items: mergedItems.map((item) =>
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
    ...metadata,
    translatedLanguage: plugin.config.translatedLanguage,
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
    decisionLog: createMangaDecisionLog(plugin.instanceId, selected),
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

      if (page.pluginType === "album-of-the-day") {
        return page;
      }

      if (page.pluginType === "mangadex-reader") {
        return {
          ...page,
          manga: await hydrateMangaSelection(page.manga),
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

  for (const plugin of config.plugins.filter((entry) => entry.enabled)) {
    try {
      if (plugin.type === "ap-headlines") {
        const result = await selectAPPage(date, plugin, aiSettings);
        pages.push(result.page);
        decisionLogs.push(result.decisionLog);
      } else if (plugin.type === "rss-reader") {
        const result = await selectRssPage(userId, date, plugin, aiSettings);
        pages.push(result.page);
        decisionLogs.push(result.decisionLog);
      } else if (plugin.type === "album-of-the-day") {
        const result = await selectAlbumPage(date, plugin);
        pages.push(result.page);
        decisionLogs.push(result.decisionLog);
      } else if (plugin.type === "mangadex-reader") {
        const result = await selectMangaPage(userId, date, plugin);
        pages.push(result.page);
        decisionLogs.push(result.decisionLog);
      } else if (plugin.type === "funny-pages") {
        const result = await selectFunnyPagesPage(date, plugin);
        pages.push(result.page);
        decisionLogs.push(result.decisionLog);
      }
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
