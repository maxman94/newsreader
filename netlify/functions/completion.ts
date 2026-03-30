import type { CompletionResponse } from "../../src/types/app";
import {
  loadCompletion,
  loadUserConfig,
  loadUserDigest,
  updateCompletion,
} from "./_lib/app-storage";
import { jsonResponse, parseRequestJson } from "./_lib/api";
import { requireIdentityUser } from "./_lib/identity";

type CompletionUpdateRequest = {
  date: string;
  pluginInstanceId: string;
  completed: boolean;
};

function resolveDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : new Date().toISOString().slice(0, 10);
}

async function resolvePluginIds(userId: string, date: string) {
  const digest = await loadUserDigest(userId, date);

  if (digest.value) {
    return digest.value.pages.map((page) => page.pluginInstanceId);
  }

  const config = await loadUserConfig(userId);
  return config.plugins.map((plugin) => plugin.instanceId);
}

export default async function completion(request: Request) {
  try {
    const user = await requireIdentityUser(request);
    const url = new URL(request.url);

    if (request.method === "GET") {
      const date = resolveDate(url.searchParams.get("date"));
      const pluginIds = await resolvePluginIds(user.id, date);
      const completion = await loadCompletion(user.id, date, pluginIds);
      return jsonResponse({ completion } satisfies CompletionResponse);
    }

    if (request.method === "POST") {
      const body = await parseRequestJson<CompletionUpdateRequest>(request);

      if (!body?.pluginInstanceId || typeof body.completed !== "boolean") {
        return jsonResponse({ error: "pluginInstanceId and completed are required." }, 400);
      }

      const date = resolveDate(body.date ?? null);
      const pluginIds = await resolvePluginIds(user.id, date);
      const completion = await updateCompletion(
        user.id,
        date,
        body.pluginInstanceId,
        body.completed,
        pluginIds,
      );

      return jsonResponse({ completion } satisfies CompletionResponse);
    }

    return jsonResponse({ error: "Method not allowed." }, 405);
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Failed to update completion.",
      },
      status,
    );
  }
}
