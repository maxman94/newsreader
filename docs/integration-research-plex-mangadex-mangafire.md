# Integration Research: Plex, MangaDex, MangaFire

Date:

- 2026-03-29

Scope:

- Investigate practical integration layers for Plex, MangaDex, and MangaFire.
- Determine which layers are stable enough for product planning.
- Identify the recommended role of each service in the product.

## Executive summary

The three services are not equivalent.

- Plex has an official, user-authenticated server integration surface and is a
  good target for library lookup, matching, and playback handoff.
- MangaDex has a real public API and a dedicated image-delivery layer, making it
  the only credible manga/comics integration target of the three.
- MangaFire appears to have a consumer web surface and some internal AJAX-style
  endpoints, but no clear public developer interface. It should be treated as a
  scrape-only fallback with high product and maintenance risk.

## Recommended stance

- `Plex`: viable official integration.
- `MangaDex`: viable public-API integration.
- `MangaFire`: do not treat as a primary integration layer.

## 1. Plex

## What exists

Plex exposes a practical server integration layer through Plex Media Server
endpoints and account tokens.

Useful layers:

- Account or server authentication via `X-Plex-Token`.
- Local or remote Plex Media Server HTTP endpoints on port `32400`.
- Library enumeration and metadata lookup through PMS URL commands.
- Event-driven hooks through Plex webhooks.

## Integration layers

### Authentication

Plex Support documents token-based authenticated access to server endpoints.

Implication:

- A user-authorized Plex integration can store a Plex token and use it to query
  the user’s server.
- This is suitable for server-side matching and playback handoff flows.

### Library access

Plex Support documents PMS URL commands for server information and library
endpoints.

Implication:

- We can query libraries, sections, and metadata from the user’s Plex server.
- This makes Plex a strong fit for the album plugin or future library-backed
  reading/listening plugins.

### Eventing

Plex webhooks are an official event channel for playback and library events.

Implication:

- Plex can support state sync, such as "started playback", "stopped", or "item
  viewed", if we later want completion heuristics.
- Webhooks are not needed for v1, but they are a credible future layer.

## Product fit

Plex is best used as:

- A library matching target.
- A playback handoff target.
- A future progress-sync target.

Plex is not ideal as:

- The primary editorial source of discovery.

## Risks

- Per-user auth and token management.
- User server reachability and network topology.
- Matching quality between editorial picks and local library items.

## Recommendation

Use Plex as an optional downstream playback integration, not as the source of
the daily recommendation itself.

## 2. MangaDex

## What exists

MangaDex has a real public API and a dedicated delivery path for chapter image
assets.

Observed live API layers:

- Public metadata endpoints such as `GET /manga` and `GET /chapter`.
- Chapter delivery bootstrap via `GET /at-home/server/{chapterId}`.
- Image delivery through MangaDex@Home-style URLs using the returned `baseUrl`,
  chapter hash, and page file list.

Official MangaDex engineering writing also describes:

- JWT-based authentication in the current API architecture.
- Global rate limits around `5 req/s/ip`.
- Public API usage as a first-class goal.

## Integration layers

### Discovery and metadata

The public API is appropriate for:

- Manga search.
- Title metadata.
- Chapter metadata.
- Filtering by language and recency.

### Chapter delivery

The `at-home/server` endpoint returns:

- A `baseUrl`.
- A chapter hash.
- Page file lists for full and data-saver assets.

Implication:

- MangaDex supports a legitimate bounded-reading model.
- We can resolve a chapter or small chapter bundle and render a finite reading
  unit.

### Authentication

Public discovery does not require the same integration depth as write actions.
For a read-only plugin, the public layer is already useful.

Implication:

- A read-only digest integration can likely avoid account coupling at first.
- Deeper features like follows, user feeds, or progress sync would require more
  account-level integration work.

## Product fit

MangaDex is a credible basis for:

- A bounded manga chapter bundle plugin.
- A backlog-driven manga reader plugin.
- A future "one chapter bundle per day" progression system.

## Risks

- Content availability varies by title and chapter.
- Translation-group and language variability complicate deterministic queues.
- Later authenticated or personalized flows need more account work.

## Recommendation

If the product wants a real manga integration, MangaDex is the correct primary
target. It has the cleanest technical boundary and the least speculative
integration risk.

## 3. MangaFire

## What exists

MangaFire appears to expose:

- A standard consumer website.
- Internal AJAX-style form endpoints visible in page markup, such as
  `ajax/user/login`, `ajax/user/register`, and `ajax/manga/request`.
- A public status page that lists an "API" component as operational.

However, this research did not uncover:

- Public developer documentation.
- A stable public API contract.
- Clear authentication guidance for third-party clients.
- A documented chapter-delivery contract comparable to MangaDex.

The site also uses Cloudflare Turnstile, which is a practical sign that browser
automation and scraping resistance are part of the operating model.

## Integration layers

### Browser scraping

Partially viable.

Observed on 2026-03-29:

- Direct manga title pages are publicly fetchable and contain usable metadata.
- Direct manga title pages expose chapter-list anchors in server-rendered HTML.
- Direct read pages are publicly fetchable and expose reading-shell metadata.
- Search and filtering appear less reliable and may return degraded or
  challenge-affected responses for unauthenticated scraping.

Practical implication:

- A scrape-based adapter can work if the app stores known MangaFire series URLs
  in plugin configuration.
- A scrape-based adapter should not depend on MangaFire search as its primary
  discovery mechanism.

### Internal AJAX endpoints

Visible in markup, but undocumented and not suitable to treat as a supported
third-party API.

### Status-page "API"

Insufficient on its own to justify product integration. An operational status
component is not a public integration contract.

## Product fit

MangaFire is only plausible as:

- A last-resort scrape target for experimentation.
- A configured-source provider where the user supplies or confirms known series
  URLs.

It is not plausible as:

- A stable primary integration layer.
- A trustworthy long-term product dependency.

## Risks

- No discovered official public API docs.
- Likely anti-bot friction.
- High schema drift risk.
- Higher legal and operational ambiguity than MangaDex.
- Chapter image delivery is not exposed directly in the read-page HTML.
- Read pages appear to rely on opaque runtime JavaScript or undocumented
  internal endpoints for image population.

## Recommendation

Do not build the primary manga/comics plugin around MangaFire. If MangaFire is
explored, treat it as a non-core fallback source behind a provider abstraction.

Recommended scrape tack:

- Allow users to configure known MangaFire title URLs directly.
- Scrape title metadata and chapter lists from those pages.
- Treat chapter-image extraction as a separate, explicitly experimental layer.
- Do not rely on undocumented AJAX endpoints or CAPTCHA bypassing.

Related implementation-pattern note:

- The Paperback repository at
  `https://github.com/TheNetsky/netskys-extensions/tree/gh-pages/0.8` is useful
  as a host-adapter pattern reference.
- It demonstrates common extension structure such as request managers, title
  parsing, chapter parsing, and chapter-page extraction from site-specific HTML
  or inline script data.
- In the inspected `0.8` branch, it did not provide direct MangaFire or
  MangaDex adapters.
- Some adapters in that repository explicitly include Cloudflare-bypass support
  for Paperback clients. That is not an implementation tactic we should copy
  into this project.

## Architectural recommendation

If we support these services, the plugin/provider boundary should be:

### Plex provider

- Purpose: library matching and playback handoff.
- Auth: per-user token.
- Core functions:
  - list servers
  - inspect libraries
  - search or match items
  - construct playback handoff target

### MangaDex provider

- Purpose: discovery and bounded chapter delivery.
- Auth: none for read-only MVP, account integration later if needed.
- Core functions:
  - search manga
  - list eligible chapters
  - resolve chapter pages through `at-home/server`
  - build finite reading units

### MangaFire provider

- Purpose: experimental fallback only.
- Auth: scrape-only, no login automation.
- Core functions:
  - parse configured title pages
  - extract chapter lists
  - expose read-shell metadata
  - optionally, later, experimental image resolution if a passive public
    boundary is discovered

## Implementation order recommendation

1. Keep Plex separate from editorial selection.
2. Use Plex only after editorial selection, for user-library matching.
3. If a manga plugin is pursued, build the first version against MangaDex.
4. If MangaFire is pursued, constrain it to configured-series scraping before
   attempting any chapter-image delivery layer.

## Sources used

- Plex Support: "Finding an authentication token / X-Plex-Token"
  https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/
- Plex Support: "Plex Media Server URL Commands"
  https://support.plex.tv/articles/201638786-plex-media-server-url-commands/
- Plex Support: "Webhooks"
  https://support.plex.tv/articles/115002267687-webhooks/
- MangaDex engineering blog: "An API to rule them all"
  https://mangadex.dev/an-api-to-rule-them-all/
- Live MangaDex API probes on 2026-03-29:
  - `https://api.mangadex.org/manga?limit=1`
  - `https://api.mangadex.org/chapter?limit=10&translatedLanguage[]=en&contentRating[]=safe&order[readableAt]=desc`
  - `https://api.mangadex.org/at-home/server/{chapterId}`
- MangaFire status page:
  https://mangafire.statuspage.io/
- MangaFire homepage markup inspected on 2026-03-29:
  https://mangafire.to/
- MangaFire title page inspected on 2026-03-29:
  https://mangafire.to/manga/one-punch-mann.oo4
- MangaFire read page inspected on 2026-03-29:
  https://mangafire.to/read/one-punch-mann.oo4/en/chapter-219
- Paperback adapter repository inspected on 2026-03-29:
  https://github.com/TheNetsky/netskys-extensions/tree/gh-pages/0.8
