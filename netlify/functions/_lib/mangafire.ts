import * as cheerio from "cheerio";
import { absoluteUrl, fetchText } from "./http";

export type MangaFireChapter = {
  id: string;
  url: string;
  label: string;
  chapterNumber?: string;
  title?: string;
  publishedAt?: string;
};

export type MangaFireSeries = {
  id: string;
  url: string;
  canonicalUrl?: string;
  title: string;
  altTitles: string[];
  status?: string;
  description: string;
  coverImage?: string;
  backdropImage?: string;
  authors: string[];
  genres: string[];
  ratingText?: string;
  chapters: MangaFireChapter[];
};

export type MangaFireReadShell = {
  url: string;
  seriesTitle: string;
  seriesUrl?: string;
  chapterLabel?: string;
  language?: string;
  chapterNumber?: string;
  nextChapterUrl?: string;
  pagesResolved: false;
};

export async function fetchMangaFireSeries(url: string) {
  const html = await fetchText(url);
  return parseMangaFireSeries(url, html);
}

export async function fetchMangaFireReadShell(url: string) {
  const html = await fetchText(url);
  return parseMangaFireReadShell(url, html);
}

export function parseMangaFireSeries(url: string, html: string): MangaFireSeries {
  const $ = cheerio.load(html);
  const title =
    $('h1[itemprop="name"]').first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.replace(/\s+Manga.*$/, "").trim() ||
    "Unknown title";
  const altTitles =
    $("h6")
      .first()
      .text()
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean) ?? [];
  const status = $(".info > p").first().text().trim() || undefined;
  const description =
    $(".description").first().text().trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    "";
  const coverImage = $(".poster img").attr("src")
    ? absoluteUrl($(".poster img").attr("src")!, url)
    : undefined;
  const backdropImage = $(".detail-bg img").attr("src")
    ? absoluteUrl($(".detail-bg img").attr("src")!, url)
    : undefined;
  const canonicalUrl = $('link[rel="canonical"]').attr("href")?.trim();

  const authors = $(".meta")
    .find("div")
    .filter((_, element) => $(element).find("span").first().text().includes("Author:"))
    .find("a")
    .map((_, element) => $(element).text().trim())
    .get()
    .filter(Boolean);

  const genres = $(".meta")
    .find("div")
    .filter((_, element) => $(element).find("span").first().text().includes("Genres:"))
    .find("a")
    .map((_, element) => $(element).text().trim())
    .get()
    .filter(Boolean);

  const ratingText = $(".min-info span b").first().parent().text().trim() || undefined;

  const chapterAnchors = $('a[href^="/read/"]')
    .map((_, element) => {
      const href = $(element).attr("href");
      const rawLabel = $(element).text().trim().replace(/\s+/g, " ");

      if (!href || !rawLabel || rawLabel.includes("Start Reading")) {
        return null;
      }

      const label = rawLabel.replace(/\s+/g, " ").trim();
      const chapterMatch = href.match(/chapter-([^/?#]+)/i);
      const dateMatch = label.match(
        /([A-Z][a-z]{2}\s+\d{2},\s+\d{4}|\d{4}-\d{2}-\d{2})$/,
      );
      const titlePart = label.replace(/^Chapter\s+[^:]+:\s*/i, "").replace(/\s+[A-Z][a-z]{2}\s+\d{2},\s+\d{4}$/, "").trim();

      return {
        id: absoluteUrl(href, url),
        url: absoluteUrl(href, url),
        label,
        chapterNumber: chapterMatch?.[1],
        title: titlePart.length > 0 && titlePart !== label ? titlePart : undefined,
        publishedAt: dateMatch?.[1],
      } satisfies MangaFireChapter;
    })
    .get()
    .filter((chapter) => chapter !== null) as MangaFireChapter[];

  return {
    id: canonicalUrl ?? url,
    url,
    canonicalUrl,
    title,
    altTitles,
    status,
    description,
    coverImage,
    backdropImage,
    authors,
    genres,
    ratingText,
    chapters: dedupeChapters(chapterAnchors),
  };
}

export function parseMangaFireReadShell(url: string, html: string): MangaFireReadShell {
  const $ = cheerio.load(html);
  const syncText = $("#syncData").text().trim();
  const syncData = safeParseJson<{
    name?: string;
    manga_url?: string;
    next_chapter_url?: string;
  }>(syncText);
  const body = $("body");

  return {
    url,
    seriesTitle:
      syncData?.name ||
      $("#ctrl-menu .head a").first().text().trim() ||
      $('meta[property="og:title"]').attr("content")?.trim() ||
      "Unknown title",
    seriesUrl: syncData?.manga_url?.trim(),
    chapterLabel: $(".current-type-number").first().text().trim() || undefined,
    language: body.attr("data-lang") ?? undefined,
    chapterNumber: body.attr("data-number") ?? undefined,
    nextChapterUrl: syncData?.next_chapter_url?.trim() || undefined,
    pagesResolved: false,
  };
}

function dedupeChapters(chapters: MangaFireChapter[]) {
  const seen = new Set<string>();
  const result: MangaFireChapter[] = [];

  for (const chapter of chapters) {
    if (seen.has(chapter.url)) {
      continue;
    }

    seen.add(chapter.url);
    result.push(chapter);
  }

  return result;
}

function safeParseJson<T>(value: string) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
