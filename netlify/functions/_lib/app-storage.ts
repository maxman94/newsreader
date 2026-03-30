import { getStore } from "@netlify/blobs";
import type {
  AISettings,
  CompletionRecord,
  MangaPluginQueue,
  PersistedDigest,
  RssPluginBucket,
  StoredAISettings,
  UserConfig,
  UserPreferences,
  UserProfile,
} from "../../../src/types/app";
import { DEFAULT_OPENAI_MODEL, DEFAULT_PREFERENCES, DEFAULT_USER_CONFIG } from "./constants";

type StorageBackend = "blobs" | "memory";

const STORE_NAME = "newsreader-app";
const memoryStore = new Map<string, unknown>();

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function keyFor(userId: string, path: string) {
  return `users/${userId}/${path}`;
}

async function readJson<T>(key: string): Promise<{ value: T | null; storage: StorageBackend }> {
  try {
    const store = getStore(STORE_NAME);
    const value = (await store.get(key, { type: "json" })) as T | null;

    if (value !== null) {
      memoryStore.set(key, clone(value));
      return { value, storage: "blobs" };
    }
  } catch {
    // Ignore and fall back to memory.
  }

  const value = (memoryStore.get(key) as T | undefined) ?? null;
  return { value: value ? clone(value) : null, storage: "memory" };
}

async function writeJson<T>(key: string, value: T): Promise<StorageBackend> {
  try {
    const store = getStore(STORE_NAME);
    await store.setJSON(key, value);
    memoryStore.set(key, clone(value));
    return "blobs";
  } catch {
    memoryStore.set(key, clone(value));
    return "memory";
  }
}

async function listKeys(prefix: string): Promise<{ keys: string[]; storage: StorageBackend }> {
  try {
    const store = getStore(STORE_NAME);
    const { blobs } = await store.list({ prefix });
    const keys = blobs.map((entry) => entry.key);

    for (const key of keys) {
      if (!memoryStore.has(key)) {
        memoryStore.set(key, true);
      }
    }

    return { keys, storage: "blobs" };
  } catch {
    const keys = [...memoryStore.keys()].filter((key) => key.startsWith(prefix));
    return { keys, storage: "memory" };
  }
}

function defaultCompletion(date: string, pluginIds: string[]): CompletionRecord {
  return {
    date,
    plugins: Object.fromEntries(
      pluginIds.map((pluginId) => [pluginId, { completed: false }]),
    ),
    updatedAt: new Date().toISOString(),
  };
}

function defaultAISettings(): StoredAISettings {
  return {
    apiKey: "",
    model: DEFAULT_OPENAI_MODEL,
    updatedAt: new Date().toISOString(),
  };
}

export function summarizeAISettings(settings: StoredAISettings): AISettings {
  return {
    hasKey: settings.apiKey.trim().length > 0,
    model: settings.model,
    updatedAt: settings.updatedAt,
  };
}

export async function loadUserProfile(userId: string) {
  const result = await readJson<UserProfile>(keyFor(userId, "profile"));
  return result.value;
}

export async function saveUserProfile(userId: string, profile: UserProfile) {
  return writeJson(keyFor(userId, "profile"), profile);
}

export async function loadUserPreferences(userId: string) {
  const result = await readJson<UserPreferences>(keyFor(userId, "preferences"));
  return result.value ? clone(result.value) : clone(DEFAULT_PREFERENCES);
}

export async function saveUserPreferences(userId: string, preferences: UserPreferences) {
  return writeJson(keyFor(userId, "preferences"), preferences);
}

export async function loadUserConfig(userId: string) {
  const result = await readJson<UserConfig>(keyFor(userId, "config"));
  return result.value ? clone(result.value) : clone(DEFAULT_USER_CONFIG);
}

export async function saveUserConfig(userId: string, config: UserConfig) {
  return writeJson(keyFor(userId, "config"), config);
}

export async function loadUserAISettings(userId: string) {
  const result = await readJson<StoredAISettings>(keyFor(userId, "ai-settings"));
  return result.value ? clone(result.value) : defaultAISettings();
}

export async function saveUserAISettings(userId: string, settings: StoredAISettings) {
  return writeJson(keyFor(userId, "ai-settings"), settings);
}

export async function loadUserDigest(userId: string, date: string) {
  return readJson<PersistedDigest>(keyFor(userId, `digests/${date}`));
}

export async function saveUserDigest(userId: string, date: string, digest: PersistedDigest) {
  return writeJson(keyFor(userId, `digests/${date}`), digest);
}

export async function listDigestDates(userId: string) {
  const prefix = keyFor(userId, "digests/");
  const result = await listKeys(prefix);
  const dates = result.keys
    .map((key) => key.slice(prefix.length))
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    .sort((left, right) => right.localeCompare(left));

  return dates;
}

export async function loadCompletion(userId: string, date: string, pluginIds: string[]) {
  const result = await readJson<CompletionRecord>(keyFor(userId, `completion/${date}`));
  const existing = result.value;
  const mergedPluginIds = new Set<string>([...pluginIds, ...Object.keys(existing?.plugins ?? {})]);
  const completion = defaultCompletion(date, [...mergedPluginIds]);

  if (existing) {
    completion.updatedAt = existing.updatedAt;
    completion.plugins = {
      ...completion.plugins,
      ...existing.plugins,
    };
  }

  return completion;
}

export async function saveCompletion(userId: string, date: string, completion: CompletionRecord) {
  return writeJson(keyFor(userId, `completion/${date}`), completion);
}

export async function updateCompletion(
  userId: string,
  date: string,
  pluginInstanceId: string,
  completed: boolean,
  pluginIds: string[],
) {
  const completion = await loadCompletion(userId, date, pluginIds);
  completion.plugins[pluginInstanceId] = {
    completed,
    completedAt: completed ? new Date().toISOString() : undefined,
  };
  completion.updatedAt = new Date().toISOString();
  await saveCompletion(userId, date, completion);
  return completion;
}

export async function loadBucket(userId: string, instanceId: string) {
  const result = await readJson<RssPluginBucket>(keyFor(userId, `buckets/${instanceId}`));

  return (
    result.value ?? {
      instanceId,
      updatedAt: new Date().toISOString(),
      items: [],
    }
  );
}

export async function saveBucket(userId: string, bucket: RssPluginBucket) {
  return writeJson(keyFor(userId, `buckets/${bucket.instanceId}`), bucket);
}

export async function loadMangaQueue(
  userId: string,
  instanceId: string,
  mangaId: string,
  translatedLanguage: string,
) {
  const result = await readJson<MangaPluginQueue>(keyFor(userId, `manga-queues/${instanceId}`));

  return (
    result.value ?? {
      instanceId,
      mangaId,
      translatedLanguage,
      updatedAt: new Date().toISOString(),
      items: [],
    }
  );
}

export async function saveMangaQueue(userId: string, queue: MangaPluginQueue) {
  return writeJson(keyFor(userId, `manga-queues/${queue.instanceId}`), queue);
}
