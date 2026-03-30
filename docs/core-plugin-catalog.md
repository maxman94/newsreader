# Core Plugin Catalog

This document describes the intended first-party plugin set. It is a product
spec, not a source commitment.

## 1. AP Headlines

### Release status

- Target: v1.

### Purpose

Give the user a bounded list of essential headlines from a trusted wire source.

### User config

- Configurable AP source lanes, each with its own label and section.
- Section choices such as politics, world, business, technology, science,
  health, climate, sports, arts, books, and travel.
- Story count target.
- Optional priority ordering across selected topics.
- Any AI-assisted ranking mode is labeled as requiring a user OpenAI key.

### Daily output

- One section containing a small number of headline items.
- Each item includes headline, source metadata, summary excerpt if available,
  and a readable action.

### Completion

- Manual complete, or threshold complete once all items have been opened or
  skimmed.

## 2. General article reader

### Release status

- Target: post-v1 unless narrowed to explicitly permitted sources.

### Purpose

Provide one or more deeper article reads from configured sources.

### User config

- Source selection.
- Topic preferences.
- Daily item count.
- In-app reading preference versus clean link-out fallback.

### Daily output

- One bounded reading section.
- Stored chosen article IDs and display metadata for archive consistency.

### Completion

- Manual complete or unit-complete after the final article is finished.

## 3. Essay of the day

### Release status

- Target: v1.

### Purpose

Add one substantial long-form read to the digest.

### Candidate sources

- RSS feeds from essay, newsletter, and blog sources.
- Curated pools of essays or newsletters.
- Editorially maintained recommended collections.

### Seed examples for curation

- Culture: Hung Up.
- Culture: Maybe Baby.
- Culture: Madwomen and Muses.
- Media and tech analysis: Cassandra Unchained.
- Software and product: The Pragmatic Engineer.
- Software and product: Lenny's Newsletter.
- Internet culture: After School.
- Research and analysis: Citrini Research.
- Creativity and life: The Hyphen.
- Language and writing: A Word About...
- Creativity and attention: Monday Monday.
- Life and philosophy: Birds Before the Storm.
- Politics and society: Letters from an American.
- Politics and society: The Free Press.
- Politics and economics: Slow Boring.
- Fashion and lifestyle: Zara Wong.
- Fashion and digital culture: User Mag.
- Sustainable living: Sustainable Baddie.
- Literary criticism and essays: Book Post.
- Literary criticism and essays: Sweater Weather.
- Politics and labor: How Things Work.
- Culture criticism: The Culture We Deserve.
- Fiction, power, beauty, and reading lists: thot pudding.
- Observational memoir: Everything is Personal.
- Literary life and criticism: The Elif Life.

### User config

- Individual RSS feed selections within the app.
- Curated pools.
- Exclusion list.
- Length preference.
- Items per day, typically 1 to 3.
- Selection policy such as `catch-up`, `newest`, or `best-of-the-day`.
- Any model-ranked policy is labeled as requiring a user OpenAI key.

### Daily output

- One to three selected entries with stable source and post identity.
- The plugin also advances or preserves its remaining candidate bucket
  according to the configured policy.

### Completion

- Unit-complete when the essay is finished, with manual override.

## 4. Album of the day

### Release status

- Target: implemented with Plex as the initial source and player.

### Purpose

Pair the reading routine with one intentional music recommendation.

### User config

- Plex server URL.
- Plex token.
- Plex music library section ID.
- Selection mode, starting with `library-random` and `recently-added`.

### Daily output

- One album with title, artist, year, tracklist, a short editorial blurb, and
  in-app Plex playback.

### Completion

- Manual complete by default.
- Optional playback-assisted heuristics later.

## 5. Funny pages

### Release status

- Target: initial GoComics-backed version implemented.

### Purpose

Add a small amount of levity through a bounded set of comic strips.

### User config

- Favorite strips or other configured GoComics sources.
- Source order, with one strip shown per configured source.
- Curated classic-strip presets for fast setup.

### Daily output

- One single-surface page with a vertical stack of comic strips.
- One strip per configured source.

### Completion

- Manual complete by default.

## 6. Manga reader

### Release status

- Target: initial MangaDex-backed version implemented.

### Purpose

Serve one bounded manga reading unit from a configured title each day.

### User config

- MangaDex title URL or manga ID.
- Translation language.
- Volumes per day, currently fixed at `1`.
- Backlog ordering, starting with simple volume order.

### Daily output

- A single card containing title metadata, one selected volume, and the
  chapters and pages from that volume rendered inline.

### Completion

- Manual complete by default.

## 7. Reader backlog

### Release status

- Target: post-v1.

### Purpose

Serve one bounded reading unit from a configured backlog each day.

### Candidate content

- Manga volumes.
- Chapter bundles.
- Graphic novel volumes.
- Trade paperbacks.

### User config

- Series list.
- Order policy.
- Unit preference.
- Daily cadence.
- Spoiler-safe metadata behavior.

### Daily output

- One queued reading unit with stable series and unit identifiers.

### Completion

- Unit-complete.
- Completion advances the queue state.

## Plugin selection notes

- The first implementation does not need all plugins at once.
- AP Headlines, Essay of the Day, and Album of the Day are likely lower-risk
  early candidates.
- Comics and manga integrations need source-rights validation before they are
  considered implementation-ready.
- AI-ranked plugin modes should always have a deterministic non-AI fallback or a
  visible locked/disabled state when the user has not configured an OpenAI key.
