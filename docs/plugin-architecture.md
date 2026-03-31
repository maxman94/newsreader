# Plugin Architecture

## Overview

Plugins are the core unit of digest composition. A plugin defines how one type
of content is configured, selected, snapshotted, rendered, and completed.

In the default product model, a plugin instance typically owns one digest page
or one clearly bounded section.

## Goals

- Let users compose a digest from modular content sources.
- Keep source-specific logic out of the core app shell.
- Preserve deterministic daily output.
- Allow each plugin to own its own config schema and completion rules.

## Concepts

### Plugin definition

A plugin definition is registered by the app and declares:

- Stable plugin ID.
- Display metadata.
- Configuration schema.
- Validation logic.
- Daily generation logic.
- Rendering component contract.
- Completion policy.
- Capability flags.

In implementation terms, first-party plugins should be added through a small
registry rather than one-off conditionals spread across the app. That registry
should centralize:

- Add-page metadata and defaults.
- Settings-panel description and config normalization.
- Daily builder selection.
- Hydration behavior.
- Reader-surface component mapping.

The goal is that a new plugin is mostly a drop-in registration plus its own
provider logic, not a cross-file hunt through unrelated UI branches.

### Plugin instance

A plugin instance is a user-configured copy of a plugin definition. Example:

- Plugin definition: `ap-headlines`.
- Plugin instance: `ap-headlines:home`.

An instance stores:

- Stable instance ID.
- Plugin definition ID.
- User-owned config payload.
- Display order.
- Enabled state.
- Any durable queue or bucket state required by the plugin's selection policy.

### Plugin run

A plugin run is the dated output of one plugin instance for one digest date.

It stores:

- User ID.
- Digest date.
- Plugin instance ID.
- Plugin version.
- Config snapshot.
- Selection inputs.
- Selected content references.
- Render payload snapshot.
- Completion metadata.
- Error state if generation failed.

## Plugin lifecycle

### 1. Configure

User creates and configures a plugin instance.

### 2. Generate

During digest generation, each enabled plugin instance runs a generator for the
target date.

### 3. Snapshot

The plugin stores a stable dated output so the digest can be re-opened later.

### 4. Render

The app renders the stored payload, not a fresh live fetch.

Rendering should follow a consistent reading-surface rule:

- Each plugin page uses one primary rounded card.
- Header metadata, title, stats, content, and completion stay inside that same
  card.
- Internal sections are separated with spacing or horizontal rules rather than
  additional outer shell cards.
- Sub-surfaces are acceptable only when functionally necessary, such as an
  embedded audio player.
- Future plugin types should default to this single-surface layout.

### 5. Complete

The plugin exposes completion semantics. Completion is persisted for habits and
archive accuracy.

## Recommended plugin contract

The implementation can vary, but the conceptual contract should look like this:

```ts
type PluginDefinition<TConfig, TResult, TCompletion> = {
  id: string;
  title: string;
  version: number;
  capabilities: PluginCapabilities;
  getDefaultConfig(): TConfig;
  validateConfig(config: unknown): TConfig;
  getConfigSuggestions?(context: SuggestionContext): Promise<SuggestionGroup[]>;
  generateDailyRun(input: DailyRunInput<TConfig>): Promise<PluginRun<TResult>>;
  renderMode: "native" | "embedded" | "hybrid";
  completion: CompletionStrategy<TCompletion>;
};
```

## Daily generation model

To keep historical digests stable, generation should separate candidate
resolution from final selection:

1. Resolve candidates from external sources.
2. Apply filtering from plugin config.
3. Select final items for the day.
4. Persist final chosen IDs and render payload.

If step 1 or 3 involves non-deterministic behavior, the result must be stored
immediately.

For feed-driven plugins, generation should usually distinguish between:

1. Feed ingestion.
2. Candidate normalization.
3. Candidate bucket update.
4. Daily selection according to the configured policy.
5. Snapshot of the chosen items and the post-selection bucket state.

This matters because a feed plugin is not only picking "today's" item. It is
also managing what remains unread or unserved for future digest dates.

## Feed-driven selection policies

RSS and similar feed-driven plugins should support policy-based selection rather
than a single hard-coded freshness sort.

Examples:

- `catch-up`: prefer older unserved items until the backlog is reduced.
- `newest`: prefer the most recent eligible items.
- `best-of-the-day`: use AI or ranking heuristics to choose the strongest item
  or small set from the current candidate pool.
- `balanced`: mix recency with backlog pressure.

Each policy should define:

- Candidate eligibility rules.
- Tie-breaking behavior.
- Maximum items per day.
- Whether already-served but incomplete items can resurface.

## Completion model

Completion should be flexible by plugin type:

- `manual`: user explicitly marks complete.
- `threshold`: plugin marks complete after a measurable threshold.
- `unit-complete`: plugin marks complete when the bounded reading/listening unit
  is finished.
- `hybrid`: plugin offers automatic completion plus manual override.

## Plugin categories

### Headlines

- Bounded list of stories.
- Topic filters.
- Typically manual or threshold completion.

### Long-form reading

- One essay or article set.
- Preserves chosen piece for the date.
- Usually unit-complete or manual completion.
- Often backed by a feed bucket or reading queue rather than a single live
  fetch.

### Listening

- One album or audio recommendation.
- Supports external playback targets.
- Completion may be manual with optional playback-aware heuristics.

### Comics and strips

- Bounded set of strip or chapter units.
- Must avoid infinite chapter scroll behavior.
- Funny pages style strip plugins should prefer a vertical stack with one strip
  per configured source.

### Backlog-driven reader

- Maintains queue state across days.
- Chooses the next unread unit according to user order settings.
- May support ordered multi-series fallbacks, such as finishing series A by
  volume before advancing to series B.

### Feed-driven reader

- Maintains a bucket of fetched but not-yet-served entries.
- Supports per-instance policies such as `catch-up`, `newest`, or
  `best-of-the-day`.
- May select a bounded number of items, such as 1 to 3 entries per day.

## Failure handling

Plugin failures should be isolated and explicit.

Failure outcomes:

- `fallback-content`: plugin emits curated fallback content.
- `empty-run`: plugin occupies its slot with an unavailable state.
- `skip-run`: plugin is omitted from that day’s digest with a recorded reason.

The chosen failure policy should be plugin-specific and visible in the archive.

## Versioning

- Plugin definitions need semantic versioning or integer migrations.
- Each stored run records the plugin version used at generation time.
- Config migrations must preserve user intent.
- Rendering updates may improve presentation, but should not alter content
  identity for archived runs.
