import type { APHeadlineSource, APTopic } from "../types/app";

export const AP_TOPIC_OPTIONS: Array<{ id: APTopic; label: string }> = [
  { id: "politics", label: "Politics" },
  { id: "world", label: "World" },
  { id: "business", label: "Business" },
  { id: "technology", label: "Technology" },
  { id: "science", label: "Science" },
  { id: "health", label: "Health" },
  { id: "climate", label: "Climate" },
  { id: "sports", label: "Sports" },
  { id: "arts", label: "Arts" },
  { id: "books", label: "Books" },
  { id: "travel", label: "Travel" },
];

export const AP_TOPIC_LABELS: Record<APTopic, string> = Object.fromEntries(
  AP_TOPIC_OPTIONS.map((topic) => [topic.id, topic.label]),
) as Record<APTopic, string>;

export const DEFAULT_AP_SOURCES: APHeadlineSource[] = [
  { id: "ap-politics", label: "AP Politics", topic: "politics" },
  { id: "ap-world", label: "AP World", topic: "world" },
  { id: "ap-business", label: "AP Business", topic: "business" },
  { id: "ap-technology", label: "AP Technology", topic: "technology" },
];

export const AP_TOPIC_PATHS: Record<APTopic, string[]> = {
  politics: ["politics", "elections", "congress"],
  world: ["middle-east", "europe", "asia-pacific", "latin-america", "africa"],
  business: ["financial-markets", "inflation"],
  technology: ["artificial-intelligence", "social-media"],
  science: ["space"],
  health: ["be-well-health"],
  climate: ["be-well-climate"],
  sports: ["sports"],
  arts: ["movies", "music"],
  books: ["books-and-literature"],
  travel: ["travel"],
};
