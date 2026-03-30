import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";
import type { Essay, RssEntry, RssEntrySelection, RssSource } from "../../../src/types/app";
import { fetchText } from "./http";

const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  trimValues: false,
});

type FeedItem = {
  title?: string;
  description?: string;
  link?: string;
  pubDate?: string;
  "content:encoded"?: string;
};

export async function getEssayCandidates(sources: RssSource[]) {
  const essays = (
    await Promise.all(
      sources.map(async (source) => {
        try {
          const xml = await fetchText(source.url);
          return parseFeed(source, xml);
        } catch {
          return [];
        }
      }),
    )
  ).flat();

  return essays.filter((essay): essay is Essay => essay !== null);
}

function cleanParagraphs(values: string[]) {
  return values
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter((value) => value.length > 0);
}

function parseArticleParagraphs(html: string) {
  const $ = cheerio.load(html);
  const selectors = [
    "article p",
    "[itemprop='articleBody'] p",
    ".entry-content p",
    ".post-content p",
    ".post-body p",
    ".article-content p",
    ".prose p",
    "main p",
  ];

  for (const selector of selectors) {
    const paragraphs = cleanParagraphs(
      $(selector)
        .map((_, element) => $(element).text())
        .get(),
    );

    if (paragraphs.length >= 2) {
      return {
        title:
          $('meta[property="og:title"]').attr("content")?.trim() ||
          $("h1").first().text().trim() ||
          undefined,
        description:
          $('meta[property="og:description"]').attr("content")?.trim() ||
          $('meta[name="description"]').attr("content")?.trim() ||
          undefined,
        body: paragraphs,
      };
    }
  }

  const fallback = cleanParagraphs(
    $("p")
      .map((_, element) => $(element).text())
      .get(),
  ).filter((paragraph) => paragraph.length >= 40);

  return {
    title:
      $('meta[property="og:title"]').attr("content")?.trim() ||
      $("h1").first().text().trim() ||
      undefined,
    description:
      $('meta[property="og:description"]').attr("content")?.trim() ||
      $('meta[name="description"]').attr("content")?.trim() ||
      undefined,
    body: fallback,
  };
}

export async function hydrateRssEntry(selection: RssEntrySelection): Promise<RssEntry> {
  const fallbackBody =
    selection.description.trim().length > 0
      ? [selection.description]
      : ["This piece could not be refreshed. Open the original post to read it."];

  try {
    const html = await fetchText(selection.url);
    const parsed = parseArticleParagraphs(html);

    return {
      ...selection,
      title: parsed.title || selection.title,
      description: parsed.description || selection.description,
      body: parsed.body.length > 0 ? parsed.body : fallbackBody,
    };
  } catch {
    return {
      ...selection,
      body: fallbackBody,
    };
  }
}

export async function hydrateRssEntries(selections: RssEntrySelection[]) {
  return Promise.all(selections.map((selection) => hydrateRssEntry(selection)));
}

function parseFeed(source: RssSource, xml: string) {
  const parsed = parser.parse(xml);
  const channel = parsed?.rss?.channel;

  if (!channel) {
    return [];
  }

  const rawItems = channel.item ?? [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];

  return items
    .slice(0, 8)
    .map((item) => parseFeedItem(source, item as FeedItem))
    .filter((essay): essay is Essay => essay !== null);
}

function parseFeedItem(source: RssSource, item: FeedItem): Essay | null {
  const title = item.title?.trim();
  const url = item.link?.trim();

  if (!title || !url) {
    return null;
  }

  const encoded = item["content:encoded"] || item.description || "";
  const $ = cheerio.load(encoded);
  const body = $("p")
    .map((_, element) => $(element).text().trim())
    .get()
    .filter(Boolean);
  const description =
    $("p").first().text().trim() ||
    cheerio.load(`<div>${item.description ?? ""}</div>`)("div").text().trim();

  if (body.length === 0 && description.length === 0) {
    return null;
  }

  return {
    id: url,
    title,
    url,
    sourceLabel: source.label,
    publishedAt: item.pubDate?.trim(),
    description,
    body: body.length > 0 ? body : [description],
    feedId: source.id,
  };
}
