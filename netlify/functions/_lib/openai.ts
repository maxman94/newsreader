import OpenAI from "openai";
import type { APStory, DecisionLog, Essay, PluginType, RssEntry } from "../../../src/types/app";
import { DEFAULT_OPENAI_MODEL } from "./constants";

function clip(text: string, limit: number) {
  return text.length <= limit ? text : `${text.slice(0, limit)}…`;
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    const cleaned = value.replace(/^```json\s*|\s*```$/g, "");

    try {
      return JSON.parse(cleaned) as T;
    } catch {
      return null;
    }
  }
}

export async function selectAPStories(
  candidates: APStory[],
  headlineCount: number,
  date: string,
  pluginInstanceId = "ap-headlines",
  pluginType: PluginType = "ap-headlines",
  aiSettings?: {
    apiKey?: string;
    model?: string;
  },
) {
  const apiKey = aiSettings?.apiKey?.trim() ?? "";
  const model = aiSettings?.model?.trim() || DEFAULT_OPENAI_MODEL;

  if (!apiKey) {
    return fallbackAPSelection(candidates, headlineCount, pluginInstanceId, pluginType);
  }

  const client = new OpenAI({ apiKey });
  const payload = candidates.map((candidate) => ({
    id: candidate.id,
    title: candidate.title,
    topic: candidate.topicLabel,
    publishedAt: candidate.publishedAt,
    description: candidate.description,
    content: clip(candidate.body.join("\n\n"), 6000),
  }));

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an editorial selector for a calm daily digest. Select stories; do not summarize or rewrite them. Return JSON only.",
      },
      {
        role: "user",
        content: JSON.stringify({
          date,
          headlineCount,
          objective:
            "Select a small set of AP stories that feels like a well-edited daily digest page. Prefer breadth, clear public importance, and minimal redundancy across chosen stories.",
          candidates: payload,
          outputSchema: {
            selectedIds: ["candidate ids"],
            rationale: "1-2 sentence explanation of the editorial logic",
            entries: [{ id: "candidate id", reason: "short reason it was chosen" }],
          },
        }),
      },
    ],
  });

  const content = completion.choices[0]?.message.content ?? "";
  const parsed = safeJsonParse<{
    selectedIds?: string[];
    rationale?: string;
    entries?: Array<{ id: string; reason: string }>;
  }>(content);

  if (!parsed?.selectedIds?.length) {
    return fallbackAPSelection(candidates, headlineCount, pluginInstanceId, pluginType);
  }

  const allowed = new Set(candidates.map((candidate) => candidate.id));
  const selectedIds = parsed.selectedIds.filter((id) => allowed.has(id)).slice(0, headlineCount);

  if (selectedIds.length === 0) {
    return fallbackAPSelection(candidates, headlineCount, pluginInstanceId, pluginType);
  }

  const stories = selectedIds
    .map((id) => candidates.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is APStory => candidate !== undefined);

  return {
    stories,
    decisionLog: {
      pluginInstanceId,
      pluginType,
      model,
      generatedAt: new Date().toISOString(),
      strategy: "openai",
      selectedIds,
      rationale: parsed.rationale ?? "Selected for breadth and editorial balance.",
      entries:
        parsed.entries?.filter((entry) => allowed.has(entry.id)).slice(0, headlineCount) ??
        stories.map((story) => ({
          id: story.id,
          reason: "Selected as a representative AP story for the digest.",
        })),
    } satisfies DecisionLog,
  };
}

export async function selectRssEntries(
  candidates: RssEntry[],
  itemCount: number,
  date: string,
  pluginInstanceId = "rss-reader",
  pluginTitle = "Reader",
  aiSettings?: {
    apiKey?: string;
    model?: string;
  },
) {
  const apiKey = aiSettings?.apiKey?.trim() ?? "";
  const model = aiSettings?.model?.trim() || DEFAULT_OPENAI_MODEL;

  if (!apiKey) {
    return fallbackRssSelection(candidates, itemCount, pluginInstanceId, pluginTitle);
  }

  const client = new OpenAI({ apiKey });
  const payload = candidates.map((candidate) => ({
    id: candidate.id,
    sourceLabel: candidate.sourceLabel,
    title: candidate.title,
    publishedAt: candidate.publishedAt,
    description: candidate.description,
    content: clip(candidate.body.join("\n\n"), 8000),
  }));

  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are selecting full-text RSS entries for a calm daily digest. Select entries only; do not summarize or rewrite them. Return JSON only.",
      },
      {
        role: "user",
        content: JSON.stringify({
          date,
          itemCount,
          pluginTitle,
          objective:
            "Choose a small set of RSS entries that feel thoughtfully edited, distinct from each other, and worth reading in full today.",
          candidates: payload,
          outputSchema: {
            selectedIds: ["candidate ids"],
            rationale: "1-2 sentence explanation of the choice",
            entries: [{ id: "candidate id", reason: "short reason it was chosen" }],
          },
        }),
      },
    ],
  });

  const content = completion.choices[0]?.message.content ?? "";
  const parsed = safeJsonParse<{
    selectedIds?: string[];
    rationale?: string;
    entries?: Array<{ id: string; reason: string }>;
  }>(content);

  if (!parsed?.selectedIds?.length) {
    return fallbackRssSelection(candidates, itemCount, pluginInstanceId, pluginTitle);
  }

  const allowed = new Set(candidates.map((candidate) => candidate.id));
  const selectedIds = parsed.selectedIds.filter((id) => allowed.has(id)).slice(0, itemCount);

  if (selectedIds.length === 0) {
    return fallbackRssSelection(candidates, itemCount, pluginInstanceId, pluginTitle);
  }

  const items = selectedIds
    .map((id) => candidates.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is RssEntry => candidate !== undefined);

  return {
    items,
    decisionLog: {
      pluginInstanceId,
      pluginType: "rss-reader",
      model,
      generatedAt: new Date().toISOString(),
      strategy: "openai",
      selectedIds,
      rationale: parsed.rationale ?? "Selected as the strongest RSS entries for the day.",
      entries:
        parsed.entries?.filter((entry) => allowed.has(entry.id)).slice(0, itemCount) ??
        items.map((item) => ({
          id: item.id,
          reason: "Selected as one of the strongest RSS entries for the digest.",
        })),
    } satisfies DecisionLog,
  };
}

export async function selectEssay(
  candidates: Essay[],
  date: string,
  aiSettings?: {
    apiKey?: string;
    model?: string;
  },
) {
  const result = await selectRssEntries(
    candidates,
    1,
    date,
    "essay-of-the-day",
    "Essay of the Day",
    aiSettings,
  );
  const essay = result.items[0];

  if (!essay) {
    throw new Error("No essay candidates available");
  }

  return {
    essay,
    decisionLog: result.decisionLog,
  };
}

function fallbackAPSelection(
  candidates: APStory[],
  headlineCount: number,
  pluginInstanceId: string,
  pluginType: PluginType,
) {
  const byTopic = new Map<string, APStory[]>();

  for (const candidate of candidates) {
    const group = byTopic.get(candidate.topic) ?? [];
    group.push(candidate);
    byTopic.set(candidate.topic, group);
  }

  const selected: APStory[] = [];
  const topicKeys = [...byTopic.keys()];
  let cursor = 0;

  while (selected.length < headlineCount && topicKeys.length > 0) {
    const topic = topicKeys[cursor % topicKeys.length];
    const group = byTopic.get(topic);

    if (group && group.length > 0) {
      selected.push(group.shift()!);
    }

    if (!group || group.length === 0) {
      byTopic.delete(topic);
      topicKeys.splice(cursor % topicKeys.length, 1);
      continue;
    }

    cursor += 1;
  }

  return {
    stories: selected,
    decisionLog: {
      pluginInstanceId,
      pluginType,
      model: "heuristic-fallback",
      generatedAt: new Date().toISOString(),
      strategy: "fallback",
      selectedIds: selected.map((story) => story.id),
      rationale: "Selected by rotating across chosen topics because no OpenAI key was available.",
      entries: selected.map((story) => ({
        id: story.id,
        reason: `Chosen as one of the top scraped ${story.topicLabel} candidates.`,
      })),
    } satisfies DecisionLog,
  };
}

function fallbackRssSelection(
  candidates: RssEntry[],
  itemCount: number,
  pluginInstanceId: string,
  pluginTitle: string,
) {
  const sorted = [...candidates].sort((left, right) => {
    const leftScore = left.body.join(" ").length + (left.description.length > 0 ? 200 : 0);
    const rightScore = right.body.join(" ").length + (right.description.length > 0 ? 200 : 0);
    return rightScore - leftScore;
  });
  const items = sorted.slice(0, Math.max(1, itemCount));

  if (items.length === 0) {
    throw new Error("No RSS candidates available");
  }

  return {
    items,
    decisionLog: {
      pluginInstanceId,
      pluginType: "rss-reader",
      model: "heuristic-fallback",
      generatedAt: new Date().toISOString(),
      strategy: "fallback",
      selectedIds: items.map((item) => item.id),
      rationale: `Selected by a simple metadata and length heuristic for ${pluginTitle} because no OpenAI key was available.`,
      entries: items.map((item) => ({
        id: item.id,
        reason: "Chosen as one of the strongest available long-form candidates by the fallback selector.",
      })),
    } satisfies DecisionLog,
  };
}
