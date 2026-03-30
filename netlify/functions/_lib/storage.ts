import { getStore } from "@netlify/blobs";
import type { StoredDigest } from "../../../src/types/digest";

const memoryStore = new Map<string, StoredDigest>();

export async function loadDigest(key: string) {
  try {
    const store = getStore("newsreader-digests");
    const digest = (await store.get(key, { type: "json" })) as StoredDigest | null;

    if (digest) {
      return { digest, storage: "blobs" as const };
    }
  } catch {
    // Ignore and fall back to memory.
  }

  const digest = memoryStore.get(key) ?? null;

  return { digest, storage: "memory" as const };
}

export async function saveDigest(key: string, digest: StoredDigest) {
  try {
    const store = getStore("newsreader-digests");
    await store.setJSON(key, digest);
    return "blobs" as const;
  } catch {
    memoryStore.set(key, digest);
    return "memory" as const;
  }
}
