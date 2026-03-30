import type { HabitsResponse } from "../../src/types/app";
import { listDigestDates, loadCompletion, loadUserConfig, loadUserDigest } from "./_lib/app-storage";
import { jsonResponse } from "./_lib/api";
import { requireIdentityUser } from "./_lib/identity";

function recentDates(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (days - index - 1));
    return date.toISOString().slice(0, 10);
  });
}

export default async function habits(request: Request) {
  try {
    const user = await requireIdentityUser(request);
    const config = await loadUserConfig(user.id);
    const url = new URL(request.url);
    const requestedDays = Number(url.searchParams.get("days") ?? "7");
    const days = recentDates(
      Number.isFinite(requestedDays) ? Math.min(Math.max(Math.round(requestedDays), 7), 31) : 7,
    );
    const archiveDates = new Set(await listDigestDates(user.id));
    const dailyData = await Promise.all(
      days.map(async (date) => {
        if (!archiveDates.has(date)) {
          return [date, { completion: null, pageDefinitions: [] }] as const;
        }

        const digest = await loadUserDigest(user.id, date);
        const pageDefinitions =
          digest.value?.pages.map((page) => ({
            pluginInstanceId: page.pluginInstanceId,
            title: page.title,
            pluginType: page.pluginType,
          })) ?? [];
        const completion = await loadCompletion(
          user.id,
          date,
          pageDefinitions.map((page) => page.pluginInstanceId),
        );

        return [date, { completion, pageDefinitions }] as const;
      }),
    );
    const completionMap = new Map(
      dailyData.map(([date, value]) => [date, value.completion] as const),
    );
    const pageMap = new Map<
      string,
      {
        pluginInstanceId: string;
        title: string;
        pluginType: HabitsResponse["rows"][number]["pluginType"];
      }
    >();

    for (const [, value] of dailyData) {
      for (const page of value.pageDefinitions) {
        if (!pageMap.has(page.pluginInstanceId)) {
          pageMap.set(page.pluginInstanceId, page);
        }
      }
    }

    const rows =
      pageMap.size > 0
        ? [...pageMap.values()]
        : config.plugins
            .filter((plugin) => plugin.enabled)
            .map((plugin) => ({
              pluginInstanceId: plugin.instanceId,
              title: plugin.title,
              pluginType: plugin.type,
            }));

    return jsonResponse({
      days,
      rows: rows.map((row) => ({
        pluginInstanceId: row.pluginInstanceId,
        title: row.title,
        pluginType: row.pluginType,
        days: days.map((date) => {
          const completion = completionMap.get(date);

          if (!completion) {
            return { date, status: "missing" as const };
          }

          return {
            date,
            status: completion.plugins[row.pluginInstanceId]?.completed ? "complete" : "incomplete",
          };
        }),
      })),
    } satisfies HabitsResponse);
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Failed to load habits.",
      },
      status,
    );
  }
}
