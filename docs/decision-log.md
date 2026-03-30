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

## D-007: Clerk first

- Status: accepted
- Decision: Clerk is the first authentication layer, with Google as the
  initial external provider enabled through Clerk.
- Rationale: it provides a stable hosted login flow, a straightforward React
  integration, and preserves the low-friction Google sign-in path.

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

## D-013: Rights assumed during the proof of concept

- Status: accepted for POC only
- Decision: the proof of concept may proceed as though display rights are
  available.
- Rationale: this lets the product prove the reading model before legal review.

## D-014: Page duration target

- Status: accepted
- Decision: standard digest pages should target roughly 5 to 10 minutes.
- Rationale: that is enough to feel substantive without regressing into
  doomscrolling.

## D-015: Paged reading model

- Status: accepted
- Decision: the reading surface is page-based.
- Rationale: page boundaries are central to finiteness and completion.

## D-016: AI selects, not summarizes

- Status: accepted
- Decision: AI is used for selection rather than summary generation on the core
  reading surface.
- Rationale: the app should feel curated, not rewritten.

## D-017: Decision logs are required

- Status: accepted
- Decision: AI-assisted selections must store short audit logs.
- Rationale: auditability matters for trust and tuning.

## D-018: Initial POC source pair

- Status: accepted
- Decision: start with AP for headlines and configurable RSS feed lists for
  essays.
- Rationale: this is the smallest source pair that proves the intended content
  mix.

## D-019: Feed-driven plugins are bucket-based

- Status: accepted
- Decision: RSS-style plugins maintain a durable bucket of fetched items and
  select from that bucket each day.
- Rationale: this supports deterministic progression and avoids accidental
  repetition.

## D-020: Feed-driven selection is policy-based

- Status: accepted
- Decision: feed-driven plugins support user-selectable policies such as
  `catch-up`, `newest`, and `best-of-the-day`.
- Rationale: different readers want either backlog reduction, freshness, or
  editorial ranking.

## D-021: Local auth development uses Netlify CLI

- Status: accepted
- Decision: authenticated local development runs through `netlify dev` rather
  than plain `vite`.
- Rationale: Netlify Functions and Blobs still need the Netlify local runtime
  even though authentication is now handled by Clerk.

## D-022: OpenAI is BYO and per-user

- Status: accepted
- Decision: OpenAI access is bring-your-own-key at the user level, not a single
  app-wide shared key.
- Rationale: AI selection should be user-controlled in cost and availability,
  and feature access must reflect whether that user has configured a key.

## D-023: Key-dependent features must be explicitly labeled

- Status: accepted
- Decision: any algorithm, mode, or plugin feature that requires an OpenAI key
  must be visibly marked as such in settings and runtime UI.
- Rationale: users need clear expectations about what will degrade to
  heuristics, what will be unavailable, and what will consume their own API
  credits.

## D-024: Album plugin starts with Plex-native playback

- Status: accepted
- Decision: the first album-of-the-day implementation uses Plex as both the
  library source and the playback target.
- Rationale: it gives the plugin a legally cleaner starting point, supports a
  bounded album-length page, and avoids building provider matching before the
  reading model is validated.

## D-025: OpenAI key is stored per user, not in app env

- Status: accepted
- Decision: OpenAI API keys are saved as per-user settings and used only on the
  server for that user’s selection requests.
- Rationale: AI ranking is a bring-your-own-key feature, so a shared
  application-level env key is the wrong ownership model.
