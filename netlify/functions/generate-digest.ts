import type { Handler } from "@netlify/functions";
import type {
  APHeadlineSource,
  APTopic,
  DigestConfig,
  GenerateDigestRequest,
  RssSource,
  GenerateDigestResponse,
  StoredDigest,
  UserConfig,
} from "../../src/types/digest";
import { AP_TOPIC_LABELS } from "../../src/data/headlines";
import { getAPCandidates } from "./_lib/ap";
import { DEFAULT_DIGEST_CONFIG, DEFAULT_USER_CONFIG } from "./_lib/constants";
import { createConfigHash } from "./_lib/hash";
import { selectAPStories, selectEssay } from "./_lib/openai";
import { getEssayCandidates } from "./_lib/rss";
import { loadDigest, saveDigest } from "./_lib/storage";

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function resolveTopics(value: unknown): APTopic[] {
  if (!Array.isArray(value)) {
    return DEFAULT_DIGEST_CONFIG.apSources.map((source) => source.topic);
  }

  const allowed = new Set<APTopic>([
    "politics",
    "world",
    "business",
    "technology",
    "science",
    "health",
    "climate",
    "sports",
    "arts",
    "books",
    "travel",
  ]);
  const topics = value.filter((item): item is APTopic => typeof item === "string" && allowed.has(item as APTopic));

  return topics.length > 0 ? topics : DEFAULT_DIGEST_CONFIG.apSources.map((source) => source.topic);
}

function topicsToSources(topics: APTopic[]): APHeadlineSource[] {
  return topics.map((topic, index) => ({
    id: `ap-${topic}-${index + 1}`,
    label: `AP ${AP_TOPIC_LABELS[topic]}`,
    topic,
  }));
}

function resolveHeadlineSources(
  sourcesValue: unknown,
  topicsValue: unknown,
): APHeadlineSource[] {
  if (Array.isArray(sourcesValue)) {
    const sources = sourcesValue
      .map((item, index) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const source = item as Partial<APHeadlineSource>;
        const topic =
          typeof source.topic === "string" && AP_TOPIC_LABELS[source.topic as APTopic]
            ? (source.topic as APTopic)
            : null;

        if (!topic) {
          return null;
        }

        return {
          id:
            typeof source.id === "string" && source.id.trim().length > 0
              ? source.id.trim()
              : `ap-${topic}-${index + 1}`,
          label:
            typeof source.label === "string" && source.label.trim().length > 0
              ? source.label.trim()
              : `AP ${AP_TOPIC_LABELS[topic]}`,
          topic,
        } satisfies APHeadlineSource;
      })
      .filter((source): source is APHeadlineSource => source !== null);

    if (sources.length > 0) {
      return sources;
    }
  }

  return topicsToSources(resolveTopics(topicsValue));
}

function resolveRssSources(value: unknown): RssSource[] {
  if (!Array.isArray(value)) {
    return DEFAULT_DIGEST_CONFIG.rssSources;
  }

  const sources = value
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const source = item as Partial<RssSource>;

      if (!source.url || typeof source.url !== "string") {
        return null;
      }

      const label =
        typeof source.label === "string" && source.label.trim().length > 0
          ? source.label.trim()
          : `Source ${index + 1}`;

      const id =
        typeof source.id === "string" && source.id.trim().length > 0
          ? source.id.trim()
          : label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      return {
        id,
        label,
        url: source.url.trim(),
      } satisfies RssSource;
    })
    .filter((source): source is RssSource => source !== null);

  return sources.length > 0 ? sources : DEFAULT_DIGEST_CONFIG.rssSources;
}

function resolveConfig(body?: GenerateDigestRequest | null): DigestConfig {
  const date =
    typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date
      : DEFAULT_DIGEST_CONFIG.date;
  const headlineCount =
    typeof body?.headlineCount === "number" && body.headlineCount > 0 && body.headlineCount < 8
      ? Math.round(body.headlineCount)
      : DEFAULT_DIGEST_CONFIG.headlineCount;

  return {
    date,
    headlineCount,
    apSources: resolveHeadlineSources(
      (body as Partial<DigestConfig> & { apTopics?: APTopic[] } | null | undefined)?.apSources,
      (body as { apTopics?: APTopic[] } | null | undefined)?.apTopics,
    ),
    rssSources: resolveRssSources(body?.rssSources),
  };
}

async function buildDigest(config: DigestConfig): Promise<StoredDigest> {
  const [apCandidates, essayCandidates] = await Promise.all([
    getAPCandidates(config.apSources),
    getEssayCandidates(config.rssSources),
  ]);

  if (apCandidates.length === 0) {
    throw new Error("No AP headline candidates were available.");
  }

  if (essayCandidates.length === 0) {
    throw new Error("No essay candidates were available from the configured RSS sources.");
  }

  const [{ stories, decisionLog: headlinesDecisionLog }, { essay, decisionLog: essayDecisionLog }] =
    await Promise.all([
      selectAPStories(apCandidates, config.headlineCount, config.date, "ap-headlines"),
      selectEssay(essayCandidates, config.date),
    ]);

  const configSnapshot: UserConfig = {
    plugins: [
      {
        ...(DEFAULT_USER_CONFIG.plugins.find((plugin) => plugin.type === "ap-headlines")!),
        instanceId: "ap-headlines",
        title: "AP Headlines",
        config: {
          sources: config.apSources,
          storyCount: config.headlineCount,
        },
      },
      {
        ...(DEFAULT_USER_CONFIG.plugins.find((plugin) => plugin.type === "rss-reader")!),
        instanceId: "essay-of-the-day",
        title: "Essay of the Day",
        config: {
          feeds: config.rssSources,
          itemsPerDay: 1,
          strategy: "best-of-day",
        },
      },
    ],
  };

  return {
    id: `digest-${config.date}-${createConfigHash(config)}`,
    date: config.date,
    configSnapshot,
    generatedAt: new Date().toISOString(),
    pages: [
      {
        id: `ap-headlines-${config.date}`,
        pluginInstanceId: "ap-headlines",
        pluginType: "ap-headlines",
        title: "AP Headlines",
        estimatedMinutes: 8,
        stories,
      },
      {
        id: `essay-${config.date}`,
        pluginInstanceId: "essay-of-the-day",
        pluginType: "rss-reader",
        title: "Essay of the Day",
        estimatedMinutes: 10,
        items: [essay],
        strategy: "best-of-day",
      },
    ],
    decisionLogs: [headlinesDecisionLog, essayDecisionLog],
  };
}

export const handler: Handler = async (event) => {
  try {
    const body =
      event.httpMethod === "POST" && event.body ? (JSON.parse(event.body) as GenerateDigestRequest) : null;
    const config = resolveConfig(body);
    const cacheKey = `${config.date}/${createConfigHash(config)}`;
    const cached = await loadDigest(cacheKey);

    if (cached.digest) {
      return json(200, {
        digest: cached.digest,
        fromCache: true,
        storage: cached.storage,
      } satisfies GenerateDigestResponse);
    }

    const digest = await buildDigest(config);
    const storage = await saveDigest(cacheKey, digest);

    return json(200, {
      digest,
      fromCache: false,
      storage,
    } satisfies GenerateDigestResponse);
  } catch (error) {
    return json(500, {
      error: error instanceof Error ? error.message : "Unexpected error generating digest.",
    });
  }
};
