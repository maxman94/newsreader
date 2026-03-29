# Decision Log

This file captures current product and architecture decisions. These are working
decisions, not immutable commitments.

## D-001: Mobile-first SPA

- Status: accepted
- Decision: the app is a mobile-first single page app.
- Rationale: the primary reading experience is personal, lightweight, and
  routine-driven. A fast SPA shell fits that pattern.

## D-002: Finite daily digest

- Status: accepted
- Decision: the product centers on a dated, bounded digest instead of a live
  infinite feed.
- Rationale: this is the core anti-doomscrolling mechanic.

## D-003: Plugin-based content model

- Status: accepted
- Decision: digest content is composed from plugin instances that users can
  configure and order.
- Rationale: content needs to be modular without turning the core app into a
  pile of source-specific conditions.

## D-004: Historical snapshots are first-class

- Status: accepted
- Decision: every daily digest stores stable plugin outputs for archive access.
- Rationale: users need to re-open yesterday’s digest and see what they were
  shown, not whatever the source returns later.

## D-005: Persist non-deterministic selection

- Status: accepted
- Decision: any randomized or freshness-based content choice must be stored.
- Rationale: determinism is required for archive fidelity and habit tracking.

## D-006: Netlify Blobs for settings and digest state

- Status: accepted
- Decision: user settings and digest state are stored in Netlify Blobs.
- Rationale: aligns with the current hosting model and keeps the first version
  operationally simple.

## D-007: Google OAuth first

- Status: accepted
- Decision: Google OAuth is the first authentication provider.
- Rationale: it offers a low-friction sign-in path for early users.

## D-008: Completion tracked per plugin instance per day

- Status: accepted
- Decision: completion is stored at the plugin-instance level for each digest
  date.
- Rationale: habits need to reflect the actual configured digest, not abstract
  plugin types.

## D-009: Backlog-driven reader progression

- Status: accepted
- Decision: backlog-based reader plugins must maintain queue state independent
  of render state.
- Rationale: reading order is longitudinal and cannot be derived solely from one
  day’s digest snapshot.

## D-010: Editorial styling over news-app conventions

- Status: accepted
- Decision: the UI should feel literary and composed rather than loud or
  feed-like.
- Rationale: the product’s tone is part of the anti-doomscrolling value
  proposition.

## D-011: Customization remains bounded

- Status: accepted
- Decision: support palette, light/dark, and typography settings, but avoid
  open-ended theming complexity.
- Rationale: readability and elegance matter more than exhaustive skinning.

## D-012: Source legality and licensing must gate integrations

- Status: accepted
- Decision: content sources are not assumed usable until rights, licensing, and
  embedding constraints are understood.
- Rationale: especially important for comics, manga, and full-text article
  rendering.
