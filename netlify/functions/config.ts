import type { UserConfig } from "../../src/types/app";
import { loadUserConfig, saveUserConfig } from "./_lib/app-storage";
import { normalizeUserConfig } from "./_lib/app-config";
import { jsonResponse, parseRequestJson } from "./_lib/api";
import { requireIdentityUser } from "./_lib/identity";

export default async function config(request: Request) {
  try {
    const user = await requireIdentityUser(request);

    if (request.method === "GET") {
      const storedConfig = await loadUserConfig(user.id);
      return jsonResponse({ config: storedConfig });
    }

    if (request.method === "PUT") {
      const nextConfig = normalizeUserConfig(await parseRequestJson<UserConfig>(request));
      await saveUserConfig(user.id, nextConfig);
      return jsonResponse({ config: nextConfig });
    }

    return jsonResponse({ error: "Method not allowed." }, 405);
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Failed to load configuration.",
      },
      status,
    );
  }
}
