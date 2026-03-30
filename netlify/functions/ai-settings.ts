import type { AISettingsResponse, StoredAISettings } from "../../src/types/app";
import { jsonResponse, parseRequestJson } from "./_lib/api";
import {
  loadUserAISettings,
  saveUserAISettings,
  summarizeAISettings,
} from "./_lib/app-storage";
import { DEFAULT_OPENAI_MODEL } from "./_lib/constants";
import { requireIdentityUser } from "./_lib/identity";

type AISettingsUpdateRequest = {
  apiKey?: string;
  clearKey?: boolean;
  model?: string;
};

function normalizeModel(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : DEFAULT_OPENAI_MODEL;
}

export default async function aiSettings(request: Request) {
  try {
    const user = await requireIdentityUser(request);

    if (request.method === "GET") {
      const settings = await loadUserAISettings(user.id);
      return jsonResponse({ settings: summarizeAISettings(settings) } satisfies AISettingsResponse);
    }

    if (request.method === "PUT") {
      const body = await parseRequestJson<AISettingsUpdateRequest>(request);
      const current = await loadUserAISettings(user.id);
      const next: StoredAISettings = {
        apiKey: body?.clearKey
          ? ""
          : typeof body?.apiKey === "string" && body.apiKey.trim().length > 0
            ? body.apiKey.trim()
            : current.apiKey,
        model: normalizeModel(body?.model ?? current.model),
        updatedAt: new Date().toISOString(),
      };

      await saveUserAISettings(user.id, next);
      return jsonResponse({ settings: summarizeAISettings(next) } satisfies AISettingsResponse);
    }

    return jsonResponse({ error: "Method not allowed." }, 405);
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Failed to update AI settings.",
      },
      status,
    );
  }
}
