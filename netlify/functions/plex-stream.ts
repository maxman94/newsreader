import { loadUserConfig, loadUserDigest } from "./_lib/app-storage";
import { hydrateDigest } from "./_lib/digest-runtime";
import { fetchPlexTrackStream } from "./_lib/plex";
import { requireIdentityUser } from "./_lib/identity";

function resolveDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : new Date().toISOString().slice(0, 10);
}

export default async function plexStream(request: Request) {
  try {
    const user = await requireIdentityUser(request);
    const url = new URL(request.url);
    const date = resolveDate(url.searchParams.get("date"));
    const pluginInstanceId = url.searchParams.get("pluginInstanceId")?.trim();
    const trackId = url.searchParams.get("trackId")?.trim();

    if (!pluginInstanceId || !trackId) {
      return new Response(JSON.stringify({ error: "pluginInstanceId and trackId are required." }), {
        status: 400,
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
      });
    }

    const [storedDigestResult, config] = await Promise.all([
      loadUserDigest(user.id, date),
      loadUserConfig(user.id),
    ]);

    const storedDigest = storedDigestResult.value;

    if (!storedDigest) {
      return new Response(JSON.stringify({ error: "Digest not found for this date." }), {
        status: 404,
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
      });
    }

    const digest = await hydrateDigest(storedDigest);
    const page = digest.pages.find(
      (
        entry,
      ): entry is Extract<(typeof digest.pages)[number], { pluginType: "album-of-the-day" }> =>
        entry.pluginType === "album-of-the-day" && entry.pluginInstanceId === pluginInstanceId,
    );

    if (!page) {
      return new Response(JSON.stringify({ error: "Album page not found." }), {
        status: 404,
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
      });
    }

    const track = page.album.tracks.find((entry) => entry.id === trackId);

    if (!track?.partKey) {
      return new Response(JSON.stringify({ error: "Track stream is unavailable." }), {
        status: 404,
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
      });
    }

    const plugin = config.plugins.find(
      (
        entry,
      ): entry is Extract<(typeof config.plugins)[number], { type: "album-of-the-day" }> =>
        entry.type === "album-of-the-day" && entry.instanceId === pluginInstanceId,
    );

    if (!plugin) {
      return new Response(JSON.stringify({ error: "Album plugin config not found." }), {
        status: 404,
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
      });
    }

    const upstream = await fetchPlexTrackStream(
      plugin.config.serverUrl,
      plugin.config.token,
      track.partKey,
    );

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "audio/mpeg",
        "content-length": upstream.headers.get("content-length") ?? "",
        "cache-control": "private, max-age=300",
      },
    });
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to stream Plex audio.",
      }),
      {
        status,
        headers: {
          "content-type": "application/json; charset=utf-8",
        },
      },
    );
  }
}
