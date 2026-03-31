import * as cheerio from "cheerio";
import type {
  ComicChapter,
  ComicChapterSelection,
  ComicQueueItem,
  ComicSelection,
  PersistedComicSelection,
  ReadComicsSource,
} from "../../../src/types/app";
import { absoluteUrl, fetchText } from "./http";

const READ_COMICS_BASE_URL = "https://readcomiconline.li";

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

let readComicsQueue = Promise.resolve();
let lastReadComicsRequestAt = 0;

function enqueueReadComicsRequest<T>(task: () => Promise<T>) {
  const run = async () => {
    const waitMs = Math.max(0, lastReadComicsRequestAt + 400 - Date.now());

    if (waitMs > 0) {
      await delay(waitMs);
    }

    lastReadComicsRequestAt = Date.now();
    return task();
  };

  const next = readComicsQueue.then(run, run);
  readComicsQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function fetchReadComicsText(url: string) {
  return enqueueReadComicsRequest(() => fetchText(url));
}

function parseIssueNumber(title: string) {
  const match = title.match(/issue\s*#?\s*([0-9]+(?:\.[0-9]+)?)/i);

  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function sortKeyForChapter(chapter: ComicChapterSelection) {
  const issueNumber = parseIssueNumber(chapter.title);

  if (issueNumber !== null) {
    return `000:${issueNumber.toString().padStart(8, "0")}:${chapter.title.toLowerCase()}`;
  }

  const publishAt = chapter.publishAt ? Date.parse(chapter.publishAt) : Number.NaN;

  if (Number.isFinite(publishAt)) {
    return `001:${new Date(publishAt).toISOString()}:${chapter.title.toLowerCase()}`;
  }

  return `999:${chapter.title.toLowerCase()}`;
}

export async function getReadComicsMetadata(seriesUrl: string) {
  const html = await fetchReadComicsText(seriesUrl);
  const $ = cheerio.load(html);

  return {
    seriesUrl,
    title:
      $(".content_top.red .heading h3").first().text().trim() ||
      $(".content_top .heading h3").first().text().trim() ||
      $("title").text().trim() ||
      "Comic",
    description:
      $('.content.space-top .section.group p')
        .first()
        .text()
        .trim()
        .replace(/\s+/g, " ") || "",
  };
}

export async function getReadComicsChapters(series: ReadComicsSource) {
  const html = await fetchReadComicsText(series.seriesUrl);
  const $ = cheerio.load(html);
  const chapters: ComicChapterSelection[] = [];
  const seen = new Set<string>();

  $(".content.space-top ul.list li").each((index, element) => {
    const link = $(element).find(".col-1 a").first();
    const href = link.attr("href");
    const title = link.text().trim().replace(/\s+/g, " ");
    const publishedText = $(element).find(".col-2 span").text().trim();

    if (!href || !title) {
      return;
    }

    const sourceUrl = absoluteUrl(href, READ_COMICS_BASE_URL);

    if (seen.has(sourceUrl)) {
      return;
    }

    seen.add(sourceUrl);
    const publishedAt = publishedText ? new Date(publishedText).toISOString() : undefined;

    chapters.push({
      id: sourceUrl,
      title,
      issue: parseIssueNumber(title)?.toString(),
      publishAt: Number.isNaN(Date.parse(publishedText)) ? undefined : publishedAt,
      pages: 0,
      sourceUrl,
    });
  });

  return chapters.sort((left, right) => sortKeyForChapter(left).localeCompare(sortKeyForChapter(right)));
}

export function mergeComicQueueItems(
  currentItems: ComicQueueItem[],
  fetched: ComicChapterSelection[],
  source: ReadComicsSource,
) {
  const now = new Date().toISOString();
  const map = new Map(
    currentItems.map((item) => [
      item.id,
      {
        ...item,
      },
    ]),
  );

  for (const chapter of fetched) {
    const existing = map.get(chapter.id);

    map.set(chapter.id, {
      ...existing,
      ...chapter,
      sourceId: source.id,
      sourceLabel: source.label,
      seriesUrl: source.seriesUrl,
      sortKey: existing?.sortKey ?? sortKeyForChapter(chapter),
      addedAt: existing?.addedAt ?? now,
      servedDate: existing?.servedDate,
    });
  }

  return [...map.values()].sort((left, right) => left.sortKey.localeCompare(right.sortKey));
}

function step1(value: string) {
  return value.substring(15, 33) + value.substring(50);
}

function step2(value: string) {
  return value.substring(0, value.length - 11) + value[value.length - 2] + value[value.length - 1];
}

function decodeReadComicsImagePath(value: string) {
  let current = value
    .replace(/EC__1J704X_/g, "a")
    .replace(/pw_.g28x/g, "b")
    .replace(/d2pr.x_27/g, "h");

  if (current.startsWith("https://")) {
    return current;
  }

  const queryIndex = current.indexOf("?");

  if (queryIndex < 0) {
    throw new Error("ReadComics image path was missing its query string.");
  }

  const query = current.substring(queryIndex);
  current = current.includes("=s0?")
    ? current.substring(0, current.indexOf("=s0?"))
    : current.substring(0, current.indexOf("=s1600?"));
  current = step1(current);
  current = step2(current);
  current = decodeURIComponent(escape(atob(current)));
  current = current.substring(0, 13) + current.substring(17);
  current = value.includes("=s0?")
    ? `${current.substring(0, current.length - 2)}=s0`
    : `${current.substring(0, current.length - 2)}=s1600`;

  return `https://2.bp.blogspot.com/${current}${query}`;
}

export async function hydrateReadComicsSelection(
  selection: PersistedComicSelection,
): Promise<ComicSelection> {
  const chapters: ComicChapter[] = [];

  for (const chapter of selection.chapters) {
    const html = await fetchReadComicsText(chapter.sourceUrl);
    const $ = cheerio.load(html);
    const imagePaths = [...html.matchAll(/pth = '([^']+)';/g)].map((match) => match[1]);

    chapters.push({
      ...chapter,
      pages: imagePaths.length,
      imageUrls: imagePaths.map((path) => decodeReadComicsImagePath(path)),
    });

    if ($("#divImage img").length === 0 && imagePaths.length === 0) {
      throw new Error(`No comic pages were available for ${chapter.title}.`);
    }
  }

  return {
    ...selection,
    chapters,
  };
}
