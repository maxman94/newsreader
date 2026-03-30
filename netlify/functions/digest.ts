import type { DigestResponse } from "../../src/types/app";
import {
  listDigestDates,
  loadUserAISettings,
  loadCompletion,
  loadUserConfig,
  loadUserDigest,
  saveUserDigest,
} from "./_lib/app-storage";
import { jsonResponse } from "./_lib/api";
import { createConfigHash } from "./_lib/hash";
import { buildDigestForUser, hydrateDigest } from "./_lib/digest-runtime";
import { requireIdentityUser } from "./_lib/identity";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default async function digest(request: Request) {
  try {
    const user = await requireIdentityUser(request);
    const url = new URL(request.url);
    const forceRefresh = ["1", "true"].includes((url.searchParams.get("force") ?? "").toLowerCase());
    const date =
      /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("date") ?? "")
        ? (url.searchParams.get("date") as string)
        : today();
    const [config, aiSettings] = await Promise.all([
      loadUserConfig(user.id),
      loadUserAISettings(user.id),
    ]);
    const cached = await loadUserDigest(user.id, date);
    const configChangedToday =
      date === today() &&
      cached.value !== null &&
      createConfigHash(cached.value.configSnapshot) !== createConfigHash(config);
    const storedDigest =
      cached.value && !configChangedToday && !forceRefresh
        ? cached.value
        : await buildDigestForUser(user.id, date, config, aiSettings);

    if (!cached.value || configChangedToday || forceRefresh) {
      await saveUserDigest(user.id, date, storedDigest);
    }

    const digest = await hydrateDigest(storedDigest);

    const completion = await loadCompletion(
      user.id,
      date,
      storedDigest.pages.map((page) => page.pluginInstanceId),
    );

    return jsonResponse({
      digest,
      completion,
      fromCache: cached.value !== null && !configChangedToday && !forceRefresh,
      storage: cached.storage,
      archiveDates: await listDigestDates(user.id),
    } satisfies DigestResponse & { archiveDates: string[] });
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Failed to load digest.",
      },
      status,
    );
  }
}
