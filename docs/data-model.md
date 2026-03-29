# Data Model

## Storage goals

- Persist user settings.
- Persist digest snapshots.
- Persist plugin configuration and ordering.
- Persist completion and habit history.
- Preserve enough source metadata to render historical digests reliably.

## Storage strategy

Netlify Blobs is the baseline persistence layer for user settings and digest
state.

Suggested storage domains:

- `users`: profile and appearance settings.
- `digest-config`: digest composition and plugin instances.
- `digests`: dated digest and plugin run snapshots.
- `completion`: per-date and per-plugin completion records.
- `queues`: backlog state for reader-style plugins.

## Core entities

### UserProfile

```ts
type UserProfile = {
  userId: string;
  email: string;
  displayName?: string;
  authProviders: string[];
  createdAt: string;
  updatedAt: string;
};
```

### UserPreferences

```ts
type UserPreferences = {
  themeMode: "light" | "dark" | "system";
  colorScheme: "default" | "sepia" | "nord" | "catppuccin" | "everforest";
  contrastMode: "standard" | "high";
  typographyPreset: "serif" | "sans" | "editorial";
  fontScale: "sm" | "md" | "lg";
  lineHeight: "tight" | "normal" | "relaxed";
  measure: "compact" | "standard" | "spacious";
};
```

### DigestConfig

```ts
type DigestConfig = {
  userId: string;
  version: number;
  pluginInstances: PluginInstanceConfig[];
  updatedAt: string;
};
```

### PluginInstanceConfig

```ts
type PluginInstanceConfig = {
  instanceId: string;
  pluginId: string;
  title?: string;
  enabled: boolean;
  order: number;
  configVersion: number;
  config: Record<string, unknown>;
};
```

### DailyDigest

```ts
type DailyDigest = {
  userId: string;
  date: string;
  status: "ready" | "partial" | "failed";
  generatedAt: string;
  digestVersion: number;
  pluginRuns: DailyPluginRunReference[];
};
```

### DailyPluginRun

```ts
type DailyPluginRun = {
  runId: string;
  userId: string;
  date: string;
  instanceId: string;
  pluginId: string;
  pluginVersion: number;
  configSnapshot: Record<string, unknown>;
  sourceSnapshot: Record<string, unknown>;
  renderPayload: Record<string, unknown>;
  selectionSeed?: string;
  completionState: PluginCompletionState;
  generatedAt: string;
  failure?: PluginFailureState;
};
```

### CompletionRecord

```ts
type CompletionRecord = {
  userId: string;
  date: string;
  instanceId: string;
  state: "not-started" | "in-progress" | "complete" | "skipped" | "failed";
  completedAt?: string;
  progress?: number;
  metadata?: Record<string, unknown>;
};
```

### ReadingQueue

```ts
type ReadingQueue = {
  userId: string;
  instanceId: string;
  mode: "series-order" | "manual-order";
  units: QueueUnit[];
  pointer: number;
  updatedAt: string;
};
```

## Blob key patterns

Example key layout:

- `users/{userId}/profile`
- `users/{userId}/preferences`
- `users/{userId}/digest-config`
- `users/{userId}/digests/{yyyy-mm-dd}`
- `users/{userId}/plugin-runs/{yyyy-mm-dd}/{instanceId}`
- `users/{userId}/completion/{yyyy-mm-dd}/{instanceId}`
- `users/{userId}/queues/{instanceId}`

## Determinism rules

- The daily digest references stored plugin runs.
- Plugin runs store the exact chosen content or a sufficient stable reference to
  reconstruct it.
- Queue-backed plugins update queue state only after the daily run is committed
  or marked complete, depending on the plugin contract.
- Historical digests are immutable by default.

## Analytics support

The data model should support:

- Digest completion rate.
- Per-plugin completion rate.
- Streak calculations.
- Missed-day summaries.
- Archive consistency audits.
