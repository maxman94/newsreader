import * as cheerio from "cheerio";
import type { APHeadlineSource, APStory, APStorySelection, APTopic } from "../../../src/types/app";
import { AP_TOPIC_PATHS } from "../../../src/data/headlines";
import { absoluteUrl, fetchText } from "./http";

type APStorySeed = {
  id: string;
  title: string;
  url: string;
  topic: APTopic;
  topicLabel: string;
};

export async function getAPCandidates(sources: APHeadlineSource[]) {
  const sourceLists = await Promise.all(
    sources.map(async (source) => {
      const seeds = await getSeedsForSource(source);
      return seeds.slice(0, 8);
    }),
  );
  const limitedSeeds = [...new Map(sourceLists.flat().map((seed) => [seed.url, seed])).values()];

  return Promise.all(
    limitedSeeds.map(async (seed) => {
      try {
        const html = await fetchText(seed.url);
        return parseAPStory(seed, html);
      } catch {
        return null;
      }
    }),
  ).then((stories) => stories.filter((story): story is APStory => story !== null));
}

export async function hydrateAPStory(selection: APStorySelection): Promise<APStory> {
  const fallbackBody =
    selection.description.trim().length > 0
      ? [selection.description]
      : ["This story could not be refreshed. Open the original story to read it."];

  try {
    const html = await fetchText(selection.url);
    const story = parseAPStory(
      {
        id: selection.id,
        title: selection.title,
        url: selection.url,
        topic: selection.topic,
        topicLabel: selection.topicLabel,
      },
      html,
    );

    if (story) {
      return story;
    }
  } catch {
    // Fall through to metadata-only fallback.
  }

  return {
    ...selection,
    body: fallbackBody,
  };
}

export async function hydrateAPStories(selections: APStorySelection[]) {
  return Promise.all(selections.map((selection) => hydrateAPStory(selection)));
}

async function getSeedsForSource(source: APHeadlineSource) {
  const paths = AP_TOPIC_PATHS[source.topic];
  const pages = await Promise.all(
    paths.map(async (path) => {
      try {
        return await fetchText(`https://apnews.com/hub/${path}`);
      } catch {
        return "";
      }
    }),
  );

  return pages.flatMap((html) =>
    html ? parseAPSectionPage(html, source.topic, source.label) : [],
  );
}

function parseAPSectionPage(html: string, topic: APTopic, topicLabel: string) {
  const $ = cheerio.load(html);
  const seeds: APStorySeed[] = [];
  const seen = new Set<string>();
  const selectors = [
    "a.PagePromo",
    "a[class*='PagePromo']",
    "a[href*='/article/']",
  ];

  for (const selector of selectors) {
    $(selector).each((_, element) => {
      const href = $(element).attr("href");
      const title = $(element).text().trim().replace(/\s+/g, " ");

      if (!href || !title || !/\/article\//.test(href)) {
        return;
      }

      const url = absoluteUrl(href, "https://apnews.com/");

      if (seen.has(url)) {
        return;
      }

      seen.add(url);
      seeds.push({
        id: url,
        title,
        url,
        topic,
        topicLabel,
      });
    });

    if (seeds.length > 0) {
      break;
    }
  }

  return seeds;
}

function parseAPStory(seed: APStorySeed, html: string): APStory | null {
  const $ = cheerio.load(html);
  const title =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("h1").first().text().trim() ||
    seed.title;
  const description =
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    "";
  const publishedAt = $('meta[property="article:published_time"]').attr("content") ?? undefined;
  const body = $(".RichTextStoryBody p")
    .map((_, element) => $(element).text().trim())
    .get()
    .filter(Boolean);

  if (!title || body.length === 0) {
    return null;
  }

  return {
    id: seed.id,
    title,
    url: seed.url,
    topic: seed.topic,
    topicLabel: seed.topicLabel,
    publishedAt,
    description,
    body,
  };
}
