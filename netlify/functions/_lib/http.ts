const DEFAULT_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (compatible; NewsreaderBot/0.1; +https://example.invalid/newsreader)",
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,text/xml;q=0.8,*/*;q=0.7",
};

export async function fetchText(url: string) {
  const response = await fetch(url, { headers: DEFAULT_HEADERS, redirect: "follow" });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }

  return response.text();
}

export function absoluteUrl(href: string, baseUrl: string) {
  return new URL(href, baseUrl).toString();
}
