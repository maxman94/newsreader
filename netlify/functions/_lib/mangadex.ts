import type {
  MangaChapter,
  MangaChapterSelection,
  MangaQueueItem,
  MangaSelection,
  PersistedMangaSelection,
} from "../../../src/types/app";

type MangaDexRelationship = {
  id: string;
  type: string;
  attributes?: {
    fileName?: string;
    name?: string;
  };
};

type MangaDexMangaResponse = {
  result: string;
  data: {
    id: string;
    attributes: {
      title: Record<string, string>;
      description?: Record<string, string>;
      year?: number;
      status?: string;
    };
    relationships: MangaDexRelationship[];
  };
};

type MangaDexFeedResponse = {
  result: string;
  total: number;
  data: Array<{
    id: string;
    attributes: {
      chapter?: string;
      volume?: string;
      title?: string;
      pages?: number;
      publishAt?: string;
      externalUrl?: string | null;
    };
  }>;
};

type MangaDexAtHomeResponse = {
  result: string;
  baseUrl: string;
  chapter: {
    hash: string;
    data: string[];
    dataSaver: string[];
  };
};

const MANGADEX_MIN_INTERVAL_MS = 300;
const MANGADEX_MAX_RETRIES = 4;
let mangadexQueue = Promise.resolve();
let lastMangaDexRequestAt = 0;

function mangaDexTitle(value: Record<string, string>) {
  return value.en ?? Object.values(value)[0] ?? "Untitled manga";
}

function preferredDescription(
  value: Record<string, string> | undefined,
  language: string,
) {
  if (!value) {
    return "";
  }

  return value[language] ?? value.en ?? Object.values(value)[0] ?? "";
}

async function fetchJson<T>(url: URL | string): Promise<T> {
  return enqueueMangaDexRequest(async () => {
    for (let attempt = 0; attempt <= MANGADEX_MAX_RETRIES; attempt += 1) {
      const response = await fetch(url, {
        headers: {
          accept: "application/json",
          "user-agent":
            "Mozilla/5.0 (compatible; NewsreaderBot/0.1; +https://example.invalid/newsreader)",
        },
        redirect: "follow",
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      if (response.status !== 429 && response.status < 500) {
        throw new Error(`MangaDex request failed: ${response.status}`);
      }

      if (attempt === MANGADEX_MAX_RETRIES) {
        throw new Error(`MangaDex request failed after retries: ${response.status}`);
      }

      await waitForRetry(response, attempt);
    }

    throw new Error("MangaDex request failed unexpectedly.");
  });
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseRetryAfter(header: string | null) {
  if (!header) {
    return null;
  }

  const seconds = Number(header);

  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const dateMs = Date.parse(header);

  if (Number.isFinite(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return null;
}

async function waitForRetry(response: Response, attempt: number) {
  const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
  const fallbackMs = 750 * 2 ** attempt;
  await delay(retryAfterMs ?? fallbackMs);
}

function enqueueMangaDexRequest<T>(task: () => Promise<T>) {
  const run = async () => {
    const waitMs = Math.max(0, lastMangaDexRequestAt + MANGADEX_MIN_INTERVAL_MS - Date.now());

    if (waitMs > 0) {
      await delay(waitMs);
    }

    lastMangaDexRequestAt = Date.now();
    return task();
  };

  const next = mangadexQueue.then(run, run);
  mangadexQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function sortKey(volume?: string, chapter?: string) {
  const volumeNumber = Number(volume ?? "0");
  const chapterNumber = Number(chapter ?? "0");

  return `${volumeNumber.toString().padStart(5, "0")}:${chapterNumber
    .toString()
    .padStart(8, "0")}:${chapter ?? "0"}`;
}

export async function getMangaDexMetadata(mangaId: string, translatedLanguage: string) {
  const url = new URL(`https://api.mangadex.org/manga/${mangaId}`);
  url.searchParams.append("includes[]", "author");
  const json = await fetchJson<MangaDexMangaResponse>(url);
  const author = json.data.relationships.find((entry) => entry.type === "author");

  return {
    mangaId: json.data.id,
    sourceUrl: `https://mangadex.org/title/${json.data.id}`,
    title: mangaDexTitle(json.data.attributes.title),
    description: preferredDescription(json.data.attributes.description, translatedLanguage),
    year: json.data.attributes.year,
    status: json.data.attributes.status,
    author: author?.attributes?.name,
  };
}

export async function getMangaDexChapters(mangaId: string, translatedLanguage: string) {
  const limit = 50;
  let offset = 0;
  const chapters: MangaChapterSelection[] = [];
  let total = 0;

  do {
    const url = new URL(`https://api.mangadex.org/manga/${mangaId}/feed`);
    url.searchParams.append("translatedLanguage[]", translatedLanguage);
    url.searchParams.append("order[volume]", "asc");
    url.searchParams.append("order[chapter]", "asc");
    url.searchParams.append("limit", String(limit));
    url.searchParams.append("offset", String(offset));
    const json = await fetchJson<MangaDexFeedResponse>(url);

    total = json.total;
    chapters.push(
      ...json.data
        .filter((entry) => !entry.attributes.externalUrl)
        .map((entry) => ({
          id: entry.id,
          title:
            entry.attributes.title?.trim() ||
            `Chapter ${entry.attributes.chapter ?? "?"}`,
          chapter: entry.attributes.chapter ?? undefined,
          volume: entry.attributes.volume ?? undefined,
          pages: entry.attributes.pages ?? 0,
          publishAt: entry.attributes.publishAt ?? undefined,
        })),
    );
    offset += limit;
  } while (offset < total);

  return chapters.sort((left, right) =>
    sortKey(left.volume, left.chapter).localeCompare(sortKey(right.volume, right.chapter)),
  );
}

export function mergeMangaQueueItems(
  currentItems: MangaQueueItem[],
  fetched: MangaChapterSelection[],
) {
  const now = new Date().toISOString();
  const map = new Map(
    currentItems.map((item) => [
      item.id,
      {
        ...item,
        sortKey: sortKey(item.volume, item.chapter),
        addedAt: now,
      },
    ]),
  );

  for (const item of fetched) {
    const existing = map.get(item.id);

    map.set(item.id, {
      ...existing,
      ...item,
      sortKey: existing?.sortKey ?? sortKey(item.volume, item.chapter),
      addedAt: existing?.addedAt ?? now,
      servedDate: existing?.servedDate,
    });
  }

  return [...map.values()].sort((left, right) => left.sortKey.localeCompare(right.sortKey));
}

export async function hydrateMangaSelection(
  selection: PersistedMangaSelection,
): Promise<MangaSelection> {
  const chapters: MangaChapter[] = [];

  for (const chapter of selection.chapters) {
    const url = new URL(`https://api.mangadex.org/at-home/server/${chapter.id}`);
    const json = await fetchJson<MangaDexAtHomeResponse>(url);
    const files =
      json.chapter.dataSaver.length > 0 ? json.chapter.dataSaver : json.chapter.data;

    chapters.push({
      ...chapter,
      imageUrls: files.map(
        (file) => `${json.baseUrl}/data-saver/${json.chapter.hash}/${file}`,
      ),
    });
  }

  return {
    ...selection,
    chapters,
  };
}
