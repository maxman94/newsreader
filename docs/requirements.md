# Requirements

## Functional requirements

### Authentication and accounts

- Users can sign in and sign out.
- Google OAuth is the first supported provider.
- The auth layer must support adding more providers later without rewriting the
  app model.
- Authenticated users have isolated settings, digest history, and completion
  history.

### Digest generation

- The system generates one digest per user per date.
- A digest is composed of ordered plugin instances.
- Each plugin instance is configured independently.
- A digest snapshot stores the exact chosen content for that date.
- Regenerating a digest for a past date must not change already-selected
  content unless explicitly re-run by an admin or migration tool.

### Deterministic content behavior

- Any non-deterministic selection must persist its result.
- Stored output must include enough provenance to render the same digest later.
- Examples of persisted selection data include chosen article IDs, author IDs,
  issue IDs, album IDs, comic strip IDs, chapter/volume IDs, ranking snapshots,
  and any random seed used during selection.

### Plugin configuration

- Users can add, remove, enable, disable, and reorder plugin instances.
- Each plugin exposes a configuration schema and defaults.
- Plugin config UIs may offer curated suggestions, such as recommended Substack
  authors or featured comic strips.
- Plugin config is user-owned and versioned to support future migrations.

### Reading and completion

- Each plugin section can be marked complete.
- Completion can be automatic, manual, or hybrid depending on plugin type.
- A digest shows aggregate progress across all enabled plugin instances.
- Completion history is stored per date and per plugin instance.

### Archive

- Users can browse previous digests by date.
- Archive views must use stored snapshots rather than re-fetching live content
  as the source of truth.
- Users can revisit completion state for historical digests.

### Habits

- The app exposes a matrix view with days as columns and plugin instances as
  rows.
- Users can inspect streaks and recent completion behavior.
- Completion analytics must rely on stored completion events or normalized
  completion summaries, not inferred UI state.

### Theming and reading customization

- The app supports light and dark appearance.
- The app supports named color schemes, including at minimum default, sepia,
  nord, catppuccin, and everforest-inspired palettes.
- The app supports typography presets and a small set of reading-specific type
  adjustments.
- Theme and reading settings persist across sessions.

## Core plugin requirements

### Headlines plugins

- Support short-form news sections from multiple sources.
- Allow topic-based filtering, such as US news, foreign policy, sports, and
  culture.
- Present a bounded list of stories for the day.

### Full article plugins

- Support a deeper read section using full articles or article extracts linked
  to readable sources.
- Preserve the exact chosen article set for the date.

### Substack or essay-of-the-day plugin

- Pull one long-form essay or post per digest.
- Support curated author suggestions and curated pools.
- Allow users to select individual authors, categories, or mixed curated feeds.

### Album of the day plugin

- Select one album per day.
- Support outbound links or deep links to major streaming services.
- Support Plex integration for self-hosted playback where available.

### Funny pages plugin

- Show a bounded set of classic comic strips chosen from user favorites.
- Allow users to choose favorite strips during setup.

### Reader or comic plugin

- Support manga, comics, or collected reading units.
- The content unit should be bounded, such as a chapter bundle, volume, or
  trade paperback.
- Support backlog mode where the user can define series order and the plugin
  serves the next unread unit each day.

## Non-functional requirements

- Mobile-first layout is the baseline. Desktop is enhanced, not primary.
- SPA navigation should feel quick and app-like.
- Reading surfaces should prioritize legibility, calm spacing, and restrained
  motion.
- The system should degrade gracefully if a source fails for a given day.
- Plugin failures should be isolated so one broken source does not block the
  entire digest.
- The architecture must support future plugin additions without editing the core
  app shell for every new plugin.

## Out of scope for first implementation

- Social features.
- Shared digests.
- User-generated plugins from arbitrary third parties.
- Real-time collaborative reading.
- Cross-user recommendation systems.
- Comics and manga integrations.
- Funny pages unless a low-risk source is identified.
- Generic full-text article ingestion across arbitrary publishers.
- Plex integration.
