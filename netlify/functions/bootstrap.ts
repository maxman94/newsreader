import type { AppBootstrapResponse } from "../../src/types/app";
import {
  listDigestDates,
  loadUserAISettings,
  loadUserConfig,
  loadUserPreferences,
  summarizeAISettings,
} from "./_lib/app-storage";
import { jsonResponse } from "./_lib/api";
import { getSession } from "./_lib/identity";

export default async function bootstrap(request: Request) {
  try {
    const session = await getSession(request);

    if (!session) {
      return jsonResponse({
        session: null,
        preferences: null,
        config: null,
        aiSettings: null,
        archiveDates: [],
      } satisfies AppBootstrapResponse);
    }

    const [preferences, config, aiSettings, archiveDates] = await Promise.all([
      loadUserPreferences(session.user.id),
      loadUserConfig(session.user.id),
      loadUserAISettings(session.user.id),
      listDigestDates(session.user.id),
    ]);

    return jsonResponse({
      session,
      preferences,
      config,
      aiSettings: summarizeAISettings(aiSettings),
      archiveDates,
    } satisfies AppBootstrapResponse);
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Failed to bootstrap app state.",
      },
      500,
    );
  }
}
