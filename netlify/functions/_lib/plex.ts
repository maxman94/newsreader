import { XMLParser } from "fast-xml-parser";
import type { AlbumSelection, AlbumSelectionStrategy, AlbumTrack } from "../../../src/types/app";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  processEntities: {
    maxTotalExpansions: 50000,
  },
});

type PlexTrackNode = {
  ratingKey?: string;
  title?: string;
  index?: string | number;
  parentIndex?: string | number;
  duration?: string | number;
  key?: string;
  Media?: {
    Part?: {
      id?: string | number;
      key?: string;
    } | Array<{
      id?: string | number;
      key?: string;
    }>;
  } | Array<{
    Part?: {
      id?: string | number;
      key?: string;
    } | Array<{
      id?: string | number;
      key?: string;
    }>;
  }>;
};

type PlexAlbumNode = {
  ratingKey?: string;
  title?: string;
  parentTitle?: string;
  year?: string | number;
  summary?: string;
  thumb?: string;
  addedAt?: string | number;
  leafCount?: string | number;
  duration?: string | number;
  Genre?: { tag?: string } | Array<{ tag?: string }>;
  key?: string;
};

const ALBUM_LINES = [
  "A deliberate album-length listen for today.",
  "A full record, meant to be kept company with from start to finish.",
  "An album chosen for the kind of hour that improves when it has a shape.",
  "A record for taking the long way through the afternoon.",
  "A complete listen, meant to hold the room for a while.",
];

function parseNumber(value: string | number | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function arrayify<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function normalizeServerUrl(value: string) {
  return value.trim().replace(/\/+$/g, "");
}

function toIsoFromUnixSeconds(value: string | number | undefined) {
  const seconds = parseNumber(value);

  return seconds ? new Date(seconds * 1000).toISOString() : undefined;
}

function plexUrl(serverUrl: string, path: string, token: string, search?: URLSearchParams) {
  const url = new URL(path, `${normalizeServerUrl(serverUrl)}/`);
  url.searchParams.set("X-Plex-Token", token);

  if (search) {
    for (const [key, value] of search.entries()) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

function plexErrorMessage(error: unknown, serverUrl: string) {
  if (!(error instanceof Error)) {
    return "Unknown Plex request failure.";
  }

  const causeMessage =
    error.cause instanceof Error
      ? error.cause.message
      : typeof error.cause === "object" &&
        error.cause !== null &&
        "message" in error.cause &&
        typeof (error.cause as { message?: unknown }).message === "string"
        ? ((error.cause as { message: string }).message)
        : "";
  const message = causeMessage || error.message;

  if (
    serverUrl.startsWith("https://") &&
    /certificate|altnames|Hostname\/IP does not match/i.test(message)
  ) {
    return `Plex HTTPS certificate mismatch for ${serverUrl}. Use a matching Plex URL, fix the certificate, or switch to http:// on a trusted network.`;
  }

  return message;
}

async function fetchPlexXml(serverUrl: string, path: string, token: string, search?: URLSearchParams) {
  const response = await fetch(plexUrl(serverUrl, path, token, search), {
    headers: {
      accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
      "x-plex-product": "Newsreader",
      "x-plex-client-identifier": "newsreader-webapp",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Plex request failed for ${path}: ${response.status}`);
  }

  return response.text();
}

function parseAlbumNode(node: PlexAlbumNode): Omit<AlbumSelection, "tracks" | "description"> | null {
  const id = node.ratingKey?.toString().trim();
  const title = node.title?.trim();
  const artist = node.parentTitle?.trim();

  if (!id || !title || !artist) {
    return null;
  }

  return {
    id,
    title,
    artist,
    year: parseNumber(node.year),
    genres: arrayify(node.Genre)
      .map((entry) => entry.tag?.trim())
      .filter((entry): entry is string => Boolean(entry)),
    thumbPath: node.thumb?.trim() || undefined,
    addedAt: toIsoFromUnixSeconds(node.addedAt),
    trackCount: parseNumber(node.leafCount) ?? 0,
    totalDurationMs: parseNumber(node.duration),
  };
}

function parseTrackNode(node: PlexTrackNode): AlbumTrack | null {
  const part = arrayify(Array.isArray(node.Media) ? node.Media[0]?.Part : node.Media?.Part)[0];
  const partKey = part?.key?.trim();
  const trackId = node.ratingKey?.toString().trim();
  const title = node.title?.trim();

  if (!trackId || !title) {
    return null;
  }

  return {
    id: trackId,
    title,
    durationMs: parseNumber(node.duration),
    discNumber: parseNumber(node.parentIndex),
    trackNumber: parseNumber(node.index),
    partKey,
    trackKey: node.key?.trim(),
  };
}

function buildAlbumBlurb(
  album: Omit<AlbumSelection, "tracks" | "description">,
  date: string,
) {
  const albumLine = ALBUM_LINES[hashString(`${date}:${album.id}`) % ALBUM_LINES.length];
  return `${albumLine}`;
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function pickAlbum(
  albums: Array<Omit<AlbumSelection, "tracks" | "description">>,
  strategy: AlbumSelectionStrategy,
  date: string,
  pluginInstanceId: string,
) {
  const sorted = [...albums].sort((left, right) => left.id.localeCompare(right.id));

  if (strategy === "recently-added") {
    return [...sorted].sort((left, right) =>
      (right.addedAt ?? "").localeCompare(left.addedAt ?? ""),
    )[0];
  }

  const seed = hashString(`${date}:${pluginInstanceId}:${sorted.map((album) => album.id).join("|")}`);
  return sorted[seed % sorted.length];
}

export async function getPlexAlbums(serverUrl: string, token: string, librarySectionId: string) {
  const candidates = [
    { path: `/library/sections/${librarySectionId}/albums`, search: undefined },
    {
      path: `/library/sections/${librarySectionId}/all`,
      search: new URLSearchParams({ type: "9" }),
    },
  ];
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      const xml = await fetchPlexXml(serverUrl, candidate.path, token, candidate.search);
      const parsed = parser.parse(xml);
      const container = parsed?.MediaContainer;
      const directories = arrayify(container?.Directory as PlexAlbumNode | PlexAlbumNode[] | undefined)
        .map((entry) => parseAlbumNode(entry))
        .filter((entry): entry is Omit<AlbumSelection, "tracks" | "description"> => entry !== null);

      if (directories.length > 0) {
        return directories;
      }
    } catch (error) {
      lastError = new Error(plexErrorMessage(error, serverUrl));
    }
  }

  if (lastError) {
    throw lastError;
  }

  return [];
}

export async function getPlexAlbumTracks(serverUrl: string, token: string, albumId: string) {
  const xml = await fetchPlexXml(serverUrl, `/library/metadata/${albumId}/children`, token);
  const parsed = parser.parse(xml);
  const container = parsed?.MediaContainer;
  const tracks = arrayify(container?.Track as PlexTrackNode | PlexTrackNode[] | undefined)
    .map((entry) => parseTrackNode(entry))
    .filter((entry): entry is AlbumTrack => entry !== null)
    .sort((left, right) => {
      const discDelta = (left.discNumber ?? 1) - (right.discNumber ?? 1);

      if (discDelta !== 0) {
        return discDelta;
      }

      return (left.trackNumber ?? 0) - (right.trackNumber ?? 0);
    });

  return tracks;
}

export async function selectPlexAlbum(
  serverUrl: string,
  token: string,
  librarySectionId: string,
  strategy: AlbumSelectionStrategy,
  date: string,
  pluginInstanceId: string,
) {
  if (!serverUrl.trim() || !token.trim() || !librarySectionId.trim()) {
    throw new Error("Plex server URL, token, and library section ID are required.");
  }

  const albums = await getPlexAlbums(serverUrl, token, librarySectionId);

  if (albums.length === 0) {
    throw new Error("No Plex albums were available in the configured library.");
  }

  const selected = pickAlbum(albums, strategy, date, pluginInstanceId);

  if (!selected) {
    throw new Error("No Plex album could be selected.");
  }

  const tracks = await getPlexAlbumTracks(serverUrl, token, selected.id);

  return {
    ...selected,
    tracks,
    description: buildAlbumBlurb(selected, date),
    trackCount: tracks.length > 0 ? tracks.length : selected.trackCount,
    totalDurationMs:
      tracks.reduce((total, track) => total + (track.durationMs ?? 0), 0) || selected.totalDurationMs,
  } satisfies AlbumSelection;
}

export async function fetchPlexTrackStream(serverUrl: string, token: string, partKey: string) {
  const response = await fetch(plexUrl(serverUrl, partKey, token), {
    headers: {
      accept: "*/*",
      "x-plex-product": "Newsreader",
      "x-plex-client-identifier": "newsreader-webapp",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Plex track request failed: ${response.status}`);
  }

  return response;
}
