import * as cheerio from "cheerio";
import type { FunnyPageStrip, FunnyPagesSource } from "../../../src/types/app";
import { fetchText } from "./http";

function formatGoComicsDate(date: string) {
  return date.replace(/-/g, "/");
}

export function getGoComicsPageUrl(slug: string, date: string) {
  return `https://www.gocomics.com/${slug}/${formatGoComicsDate(date)}`;
}

async function getGoComicsStrip(source: FunnyPagesSource, date: string): Promise<FunnyPageStrip | null> {
  if (!source.slug) {
    return null;
  }

  const url = getGoComicsPageUrl(source.slug, date);

  try {
    const html = await fetchText(url);
    const $ = cheerio.load(html);
    const imageUrl = $('meta[property="og:image"]').attr("content")?.trim();

    if (!imageUrl) {
      return null;
    }

    return {
      id: `${source.slug}:${date}`,
      sourceId: source.id,
      label: source.label,
      slug: source.slug,
      url,
      imageUrl,
    };
  } catch {
    return null;
  }
}

async function getLatestWebcomicStrip(source: FunnyPagesSource, date: string): Promise<FunnyPageStrip | null> {
  if (!source.url) {
    return null;
  }

  try {
    const html = await fetchText(source.url);
    const $ = cheerio.load(html);
    const imageUrl =
      $('meta[property="og:image"]').attr("content")?.trim() ||
      $('meta[name="twitter:image"]').attr("content")?.trim();
    const finalUrl = $('meta[property="og:url"]').attr("content")?.trim() || source.url;

    if (!imageUrl) {
      return null;
    }

    return {
      id: `${source.id}:${date}`,
      sourceId: source.id,
      label: source.label,
      slug: source.url,
      url: finalUrl,
      imageUrl,
    };
  } catch {
    return null;
  }
}

export async function getFunnyPageStrips(sources: FunnyPagesSource[], date: string) {
  const strips = await Promise.all(
    sources.map((source) =>
      source.provider === "latest-webcomic"
        ? getLatestWebcomicStrip(source, date)
        : getGoComicsStrip(source, date),
    ),
  );
  return strips.filter((strip): strip is FunnyPageStrip => strip !== null);
}
