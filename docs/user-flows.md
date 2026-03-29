# User Flows

## App structure

Although the product is a single page app, it should behave like a focused
reader with a small number of top-level views.

Proposed primary views:

- `Today`: today’s digest and progress.
- `Archive`: previous dated digests.
- `Habits`: completion matrix and streak summaries.
- `Settings`: profile, appearance, plugin configuration, and integrations.

## First-run flow

1. User lands on the marketing-free app shell.
2. User signs in with Google.
3. User chooses an appearance preset.
4. User selects a starter digest template or starts from scratch.
5. User configures initial plugins.
6. System generates the first digest for today.
7. User enters reading mode.

## Daily reading flow

1. User opens the app.
2. App resolves whether today’s digest already exists.
3. If it exists, app opens the stored snapshot.
4. If it does not exist, backend generates and stores it.
5. User moves through plugin sections one page at a time.
6. User marks sections complete or completion is inferred from the reading unit.
7. App shows cumulative digest progress and a clear end state.

## Archive flow

1. User opens `Archive`.
2. User selects a previous date.
3. App loads the stored digest snapshot and completion state for that date.
4. User reads the digest as it originally appeared, subject only to rendering
   improvements that preserve content identity.

## Habit review flow

1. User opens `Habits`.
2. App displays plugin rows and date columns.
3. Cells indicate complete, partial, skipped, unavailable, or not scheduled.
4. User can inspect streaks and recent misses.

## Plugin configuration flow

1. User opens `Settings`.
2. User enters the digest composition editor.
3. User adds or reorders plugin instances.
4. User edits per-plugin configuration.
5. User saves changes.
6. Changes affect future digests, not already-generated historical digests.

## Reader backlog flow

1. User adds a reader plugin instance.
2. User selects one or more series.
3. User defines order and unit preference, such as chapter bundle, volume, or
   trade.
4. System stores a reading queue.
5. Each day the plugin claims the next unread unit and snapshots it into the
   digest.
6. Completion advances the queue pointer.

## UX principles

- The user should always know where they are in the digest.
- The user should always know how much remains.
- Settings should be discoverable but not intrude on reading.
- Archived digests should feel like preserved editions, not regenerated feeds.
