# Core Plugin Catalog

This document describes the intended first-party plugin set. It is a product
spec, not a source commitment.

## 1. AP Headlines

### Release status

- Target: v1.

### Purpose

Give the user a bounded list of essential headlines from a trusted wire source.

### User config

- Topic selection, such as US news, foreign policy, sports, and culture.
- Story count target.
- Optional priority ordering across selected topics.

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

- Substack authors.
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

- Individual author subscriptions within the app.
- Curated pools.
- Exclusion list.
- Length preference.

### Daily output

- One selected essay with stable author and post identity.

### Completion

- Unit-complete when the essay is finished, with manual override.

## 4. Album of the day

### Release status

- Target: optional v1 if implemented as metadata plus outbound links only.

### Purpose

Pair the reading routine with one intentional music recommendation.

### User config

- Genre preferences.
- New releases versus catalog mix.
- Preferred playback targets.
- Plex matching preference.

### Daily output

- One album with art, metadata, and playback targets.

### Completion

- Manual complete by default.
- Optional playback-assisted heuristics later.

## 5. Funny pages

### Release status

- Target: post-v1 unless a legally clean and technically simple source is
  identified.

### Purpose

Add a small amount of levity through a bounded set of comic strips.

### User config

- Favorite strips.
- Daily strip count.
- Rotation behavior if favorites exceed the daily limit.

### Daily output

- A page with one or a few selected strips.

### Completion

- Threshold complete after the day’s strips are viewed.

## 6. Reader backlog

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
