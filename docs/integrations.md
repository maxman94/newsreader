# Integrations

## Integration philosophy

Integrations should expand the digest without making the product dependent on
unbounded external UX. When possible, the app should import, bound, and
snapshot content rather than sending users directly into third-party feeds.

## Authentication

### Clerk

Clerk is the starter auth layer.

Requirements:

- Support basic sign-in and sign-out.
- Support Google as the first enabled external provider.
- Use Clerk hosted auth flows on the client.
- Use Clerk session tokens for protected Netlify function calls.
- Store app-owned settings and digest data keyed to the Clerk user ID.

Implementation note:

- Use the Clerk React SDK on the client and Clerk backend request
  authentication on the server.
- Authenticated local development still uses `netlify dev` for functions and
  blobs, but Clerk allowed origins and redirect URLs must also allow the local
  origin.

## AI providers

### OpenAI

OpenAI is a user-level optional integration, not a global app dependency.

Requirements:

- Each user may provide their own API key.
- The key should be treated as a user-owned secret and persisted accordingly.
- AI-powered selection features must declare their dependency on OpenAI.
- Non-AI fallback behavior must be documented for each affected plugin mode.

Implementation note:

- Model-based story or feed ranking should run server-side using the specific
  user’s stored key.
- The client should only receive a summary such as `hasKey` and selected model,
  not the stored key value itself.
- The app should expose a clear `requires OpenAI key` label anywhere a user can
  choose an AI-dependent algorithm such as `best-of-the-day`.

## Netlify platform

### Netlify Blobs

Netlify Blobs is the baseline persistence layer for:

- User preferences.
- Digest configuration.
- Daily digest snapshots.
- Completion history.
- Queue state for backlog-driven plugins.

### Netlify server runtime

Use Netlify server routes, edge functions, or functions for:

- Auth callback handling.
- Protected data access.
- Scheduled digest generation.
- Integration credential exchange.
- Source fetches that should not run directly from the client.

## News sources

Potential starter categories:

- Wire headlines.
- Publication-specific headline feeds.
- Readable article sources.

Requirements:

- Each source integration must define licensing and allowed display behavior.
- If full-text rendering is not permitted, store metadata and link out cleanly.
- Topic taxonomies should normalize into shared internal categories where
  possible.

POC starting point:

- AP is the first implemented headlines source.
- AP homepage or section scraping is acceptable for the proof of concept.
- AI selects from scraped AP candidates, but source content is displayed
  directly rather than summarized.
- If headlines move to RSS-first ingestion, prioritize sources with stable,
  official feeds and clear reuse terms.

Candidate RSS-oriented alternatives to evaluate:

- Reuters News Agency: strong fit for factual wire-style headlines, but RSS
  delivery is aimed at authenticated customers rather than open public feeds.
- PBS News: official RSS feeds exist and are operationally simpler for a public
  web product than agency contracts.
- BBC Information Syndication API: RSS is available, but only for authorized
  syndication partners with API keys and contract terms.
- Deutsche Welle: offers RSS/content-feed models including headline-only and
  teaser variants, with emphasis on international coverage.

## Essay and blog sources

### RSS-first essay sources

Desired behavior:

- One essay or post per day.
- Curated author suggestions.
- Curated pools for broader discovery.

Requirements:

- Source selection policy must be explicit.
- The app should distinguish between source recommendation and actual
  subscription management.
- For the proof of concept, start with a configurable list of RSS feeds rather
  than scraping publication homepages.
- AI selects the essay of the day from fetched feed entries and stores a
  decision log.
- Model-ranked feed modes should be marked as requiring a user OpenAI key.

Starter curation seeds mentioned so far:

- Culture: Hung Up, Maybe Baby, Madwomen and Muses.
- Media and tech: Cassandra Unchained.
- Software and business: The Pragmatic Engineer, Lenny's Newsletter, After
  School, Citrini Research.
- Writing and life: The Hyphen, A Word About..., Monday Monday, Birds Before
  the Storm.
- Politics and society: Letters from an American, The Free Press, Slow Boring.
- Fashion and lifestyle: Zara Wong, User Mag, Sustainable Baddie.
- Literary and essay-oriented additions from Literary Hub's August 30, 2024
  roundup: Book Post, Sweater Weather, How Things Work, The Culture We Deserve,
  thot pudding, Birds Before the Storm, Everything is Personal, The Elif Life,
  and Madwomen and Muses.

Implementation note:

- Some of these sources may still be Substack-hosted, but the proof-of-concept
  ingestion boundary is RSS rather than homepage scraping.

## Music integrations

### Streaming providers

Support outbound or deep links to major streaming services such as Spotify,
Apple Music, and TIDAL when feasible.

### Plex

The current album-of-the-day implementation is Plex-native.

Implementation notes:

- The plugin selects directly from a configured Plex music library section.
- The stored daily snapshot keeps the chosen album and track metadata.
- Playback is proxied through the app rather than requiring the browser to talk
  to Plex directly.
- Initial selection modes are `library-random` and `recently-added`.

## Comics and manga sources

Requirements:

- Only integrate with sources whose usage model and embedding rights are
  acceptable for the product.
- Bound the reading unit to avoid infinite-scroll chapter behavior.
- Store the chosen issue, chapter bundle, volume, or trade for archive
  consistency.

Risk note:

- Some comic and manga sites have questionable legality or unstable APIs. These
  should be treated as research items, not implementation assumptions.

Current implementation note:

- The current funny-pages implementation uses GoComics date pages as the
  initial bounded source for classic strips.
- It renders one strip per configured source in a vertical stack.
- The current bounded reader implementation uses MangaDex as the source for
  title metadata, chapter ordering, and chapter image delivery.
- The first version is backlog-based: it walks a configured title in volume
  order and serves the next unread volume each day.

## Scheduling

Digest generation likely needs a scheduled job.

Requirements:

- Generate the next digest daily in the user’s local timezone or a configured
  digest timezone.
- Allow on-demand generation if the scheduled run has not yet occurred.
- Avoid generating multiple conflicting digests for the same user and date.
