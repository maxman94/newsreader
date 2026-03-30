import type { UserPreferences } from "../../src/types/app";
import { loadUserPreferences, saveUserPreferences } from "./_lib/app-storage";
import { normalizePreferences } from "./_lib/app-config";
import { jsonResponse, parseRequestJson } from "./_lib/api";
import { requireIdentityUser } from "./_lib/identity";

export default async function preferences(request: Request) {
  try {
    const user = await requireIdentityUser(request);

    if (request.method === "GET") {
      const preferences = await loadUserPreferences(user.id);
      return jsonResponse({ preferences });
    }

    if (request.method === "PUT") {
      const nextPreferences = normalizePreferences(await parseRequestJson<UserPreferences>(request));
      await saveUserPreferences(user.id, nextPreferences);
      return jsonResponse({ preferences: nextPreferences });
    }

    return jsonResponse({ error: "Method not allowed." }, 405);
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Failed to load preferences.",
      },
      status,
    );
  }
}
