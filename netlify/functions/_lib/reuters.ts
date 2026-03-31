import * as cheerio from "cheerio";
import type { APStory, APStorySelection, ReutersHeadlineSource, APTopic } from "../../../src/types/app";

const REUTERS_TOPIC_PATHS: Record<APTopic, string> = {
  politics: "/world/us/",
  world: "/world/",
  business: "/business/",
  technology: "/technology/",
  science: "/world/science/",
  health: "/business/healthcare-pharmaceuticals/",
  climate: "/sustainability/climate-energy/",
  sports: "/sports/",
  arts: "/world/lifestyle/",
  books: "/world/lifestyle/",
  travel: "/world/lifestyle/",
};

type ReutersSeed = {
  id: string;
  title: string;
  url: string;
  description: string;
  publishedAt?: string;
  topic: APTopic;
  topicLabel: string;
};

async function fetchReutersCollection(sectionId: string) {
  const url = new URL("https://www.reuters.com/pf/api/v3/content/fetch/articles-by-section-alias-or-id-v1");
  url.searchParams.set(
    "query",
    JSON.stringify({
      "arc-site": "reuters",
      fetch_type: "collection_or_section",
      orderby: "last_updated_date:desc",
      section_id: sectionId,
      size: 10,
      website: "reuters",
    }),
  );
  url.searchParams.set("_website", "reuters");

  const response = await fetch(url, {
    headers: {
      accept: "application/json,text/plain,*/*",
      "user-agent":
        "Mozilla/5.0 (compatible; NewsreaderBot/0.1; +https://example.invalid/newsreader)",
    },
    redirect: "follow",
  });

  if (response.status === 401) {
    throw new Error("Reuters returned an anti-bot challenge for this request.");
  }

  if (!response.ok) {
    throw new Error(`Reuters request failed: ${response.status}`);
  }

  return (await response.json()) as unknown;
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "";
}

function pickUrl(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string" || value.trim().length === 0) {
      continue;
    }

    const trimmed = value.trim();
    return trimmed.startsWith("http") ? trimmed : `https://www.reuters.com${trimmed}`;
  }

  return "";
}

function maybeSeedFromObject(value: unknown, topic: APTopic, topicLabel: string): ReutersSeed | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const entry = value as Record<string, unknown>;
  const title = pickString(
    entry.headline,
    entry.title,
    (entry.headlines as Record<string, unknown> | undefined)?.basic,
    ((entry.promo_items as Record<string, unknown> | undefined)?.basic as Record<string, unknown> | undefined)
      ?.headline,
  );
  const url = pickUrl(
    entry.canonical_url,
    entry.url,
    entry.website_url,
    ((entry.promo_items as Record<string, unknown> | undefined)?.basic as Record<string, unknown> | undefined)
      ?.url,
  );

  if (!title || !url || !/reuters\.com/.test(url)) {
    return null;
  }

  return {
    id: url,
    title,
    url,
    description: pickString(
      entry.description,
      (entry.description as Record<string, unknown> | undefined)?.basic,
      ((entry.promo_items as Record<string, unknown> | undefined)?.basic as Record<string, unknown> | undefined)
        ?.description,
      (
        ((entry.promo_items as Record<string, unknown> | undefined)?.basic as Record<string, unknown> | undefined)
          ?.description as Record<string, unknown> | undefined
      )?.basic,
    ),
    publishedAt: pickString(entry.published_time, entry.display_date, entry.updated_date) || undefined,
    topic,
    topicLabel,
  };
}

function collectReutersSeeds(
  value: unknown,
  topic: APTopic,
  topicLabel: string,
  seen = new Map<string, ReutersSeed>(),
) {
  const seed = maybeSeedFromObject(value, topic, topicLabel);

  if (seed && !seen.has(seed.url)) {
    seen.set(seed.url, seed);
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectReutersSeeds(entry, topic, topicLabel, seen);
    }

    return seen;
  }

  if (!value || typeof value !== "object") {
    return seen;
  }

  for (const nested of Object.values(value as Record<string, unknown>)) {
    collectReutersSeeds(nested, topic, topicLabel, seen);
  }

  return seen;
}

function toStory(seed: ReutersSeed): APStory {
  return {
    id: seed.id,
    title: seed.title,
    url: seed.url,
    topic: seed.topic,
    topicLabel: seed.topicLabel,
    publishedAt: seed.publishedAt,
    description: seed.description,
    body: seed.description ? [seed.description] : ["Open the original story to read this Reuters piece."],
  };
}

export async function getReutersCandidates(sources: ReutersHeadlineSource[]) {
  const stories = await Promise.all(
    sources.map(async (source) => {
      const json = await fetchReutersCollection(REUTERS_TOPIC_PATHS[source.topic]);
      const seeds = [...collectReutersSeeds(json, source.topic, source.label).values()].slice(0, 8);
      return seeds.map((seed) => toStory(seed));
    }),
  );

  return [...new Map(stories.flat().map((story) => [story.url, story])).values()];
}

export async function hydrateReutersStory(selection: APStorySelection): Promise<APStory> {
  try {
    const response = await fetch(selection.url, {
      headers: {
        accept: "text/html,application/xhtml+xml,*/*",
        "user-agent":
          "Mozilla/5.0 (compatible; NewsreaderBot/0.1; +https://example.invalid/newsreader)",
      },
      redirect: "follow",
    });

    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);
      const body = $("article p, main p")
        .map((_, element) => $(element).text().trim())
        .get()
        .filter(Boolean);
      const description =
        $('meta[property="og:description"]').attr("content")?.trim() ||
        $('meta[name="description"]').attr("content")?.trim() ||
        selection.description;

      if (body.length > 0) {
        return {
          ...selection,
          description,
          body,
        };
      }
    }
  } catch {
    // Fall back to the stored metadata-only version.
  }

  return {
    ...selection,
    body: selection.description
      ? [selection.description]
      : ["This Reuters story could not be refreshed. Open the original story to read it."],
  };
}

export async function hydrateReutersStories(selections: APStorySelection[]) {
  return Promise.all(selections.map((selection) => hydrateReutersStory(selection)));
}
