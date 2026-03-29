# Integrations

## Integration philosophy

Integrations should expand the digest without making the product dependent on
unbounded external UX. When possible, the app should import, bound, and
snapshot content rather than sending users directly into third-party feeds.

## Authentication

### Google OAuth

Google OAuth is the starter auth provider.

Requirements:

- Support basic sign-in and sign-out.
- Store a stable app user ID independent of provider-specific identifiers.
- Keep provider access details out of client-exposed storage.

Implementation note:

- The auth implementation should be wrapped behind an internal auth service so
  additional providers can be added later.

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

## Essay and blog sources

### Substack

Desired behavior:

- One essay or post per day.
- Curated author suggestions.
- Curated pools for broader discovery.

Requirements:

- Source selection policy must be explicit.
- The app should distinguish between source recommendation and actual
  subscription management.

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

## Music integrations

### Streaming providers

Support outbound or deep links to major streaming services such as Spotify,
Apple Music, and TIDAL when feasible.

### Plex

Plex support should let a user route album-of-the-day playback to a personal
library when a match exists.

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

## Scheduling

Digest generation likely needs a scheduled job.

Requirements:

- Generate the next digest daily in the user’s local timezone or a configured
  digest timezone.
- Allow on-demand generation if the scheduled run has not yet occurred.
- Avoid generating multiple conflicting digests for the same user and date.
