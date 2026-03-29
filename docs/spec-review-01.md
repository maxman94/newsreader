# Spec Review 01

Date:

- 2026-03-29

Scope:

- First structured review of the product and architecture docs.

Outcome:

- The core product concept is worth keeping.
- The first-release scope needs to be narrowed materially.
- The main risk is not frontend complexity. It is integration realism, rights,
  and operational clarity around generation and storage.

## Executive summary

The spec has the right center of gravity:

- A finite daily digest is the correct anti-doomscrolling mechanic.
- Plugin-based composition is the right content abstraction.
- Archive fidelity and deterministic snapshots are essential and correctly
  prioritized.
- The reading tone and visual direction are coherent and differentiated.

The current weakness is first-release breadth. The spec combines:

- multiple external content classes,
- per-plugin config UIs,
- daily generation,
- auth,
- archive,
- habit tracking,
- theme customization,
- and several high-risk integrations.

That is too much for one initial implementation if the goal is a working,
defensible v1 rather than a broad prototype.

## Decisions

## Accept

### A-001: Finite digest as the primary product shape

- Decision: accept.
- Reason: this is the clearest product differentiator and should remain the
  center of the app.

### A-002: Top-level views

- Decision: accept `Today`, `Archive`, `Habits`, and `Settings`.
- Reason: these are sufficient for the product shape without introducing feed
  sprawl.

### A-003: Plugin instances as user-configured digest units

- Decision: accept.
- Reason: plugin instances support composition, ordering, and future growth
  without hard-coding source logic into the shell.

### A-004: Historical snapshots are first-class

- Decision: accept.
- Reason: archive fidelity is not optional for this product. It is part of the
  trust model.

### A-005: Bounded customization

- Decision: accept.
- Reason: palette, light/dark, and typography controls are enough to make the
  app personal without dissolving the editorial tone.

## Revise

### R-001: First-release plugin scope

- Decision: revise.
- New v1 target: support 2 to 3 plugin types only.
- Recommended v1 plugin order:
  1. Headlines.
  2. Essay of the Day.
  3. Album of the Day as metadata plus link-out only.
- Reason: this keeps the product varied without taking on the highest rights and
  ingestion risks first.

### R-002: Full article reading in v1

- Decision: revise.
- New v1 stance: do not promise general in-app full-text article rendering.
- Replacement: support excerpts, summaries, metadata, and clean link-out unless
  a source explicitly permits richer display.
- Reason: rights, parsing quality, and source variability make this a poor early
  commitment.

### R-003: Plugin completion semantics

- Decision: revise.
- New v1 stance: default to manual completion across all plugin types, with
  optional lightweight thresholds for simple cases.
- Reason: automatic completion heuristics are attractive but not core to the
  product’s first proof.

### R-004: Digest generation timing

- Decision: revise.
- New v1 stance: on-demand generation is required; scheduled pre-generation is
  desirable but not mandatory for the first shippable version.
- Reason: scheduled generation adds timezone, orchestration, idempotency, and
  retry concerns that are real but not necessary to validate the product.

### R-005: Theme system scope

- Decision: revise.
- New v1 stance: implement light and dark mode plus 3 curated palettes first,
  then expand to the larger palette set once the reading experience is stable.
- Reason: the visual system should be polished before it is broad.

### R-006: Curated suggestions

- Decision: revise.
- New v1 stance: curated author and source suggestions can ship as a static
  internal catalog.
- Reason: there is no need to build dynamic recommendation infrastructure for
  the first version.

## Defer

### D-001: Multiple digest templates

- Decision: defer.
- Reason: weekday versus weekend variants are useful, but they complicate config
  and scheduling before the base model is proven.

### D-002: Plex integration

- Decision: defer.
- Reason: per-user credentials and playback matching add complexity that is not
  needed to validate the album concept.

### D-003: Reversible historical completion

- Decision: defer.
- Reason: useful, but not central enough to block a v1 model.

### D-004: Automatic completion heuristics

- Decision: defer.
- Reason: analytics-driven or playback-aware completion can wait.

### D-005: Per-user timezone scheduling sophistication

- Decision: defer.
- Reason: v1 can store a user timezone but rely primarily on on-demand digest
  creation.

## Cut from v1

### C-001: Comics and manga integrations

- Decision: cut from first release.
- Reason: rights, legality, embedding constraints, and queue complexity make
  this a phase-two area at best.

### C-002: Funny pages plugin

- Decision: cut from first release unless a legally clean source is identified
  quickly.
- Reason: this is conceptually good for the product, but still source-dependent.

### C-003: Generic full article ingestion

- Decision: cut from first release as a generalized promise.
- Reason: not realistic without narrowing to specific licensed or technically
  simple sources.

## Gaps that still need decisions

### Product gaps

- Default digest length is still undefined.
- The product needs a target daily session length.
- The app needs a default starter template for first-run onboarding.

### UX gaps

- The reading surface is still underspecified.
- The spec says "page" and "section" somewhat interchangeably.
- The progress model needs a single rule: per-plugin sections in a vertical
  stack, horizontal pager, or a hybrid.

### Technical gaps

- The auth implementation is still abstract.
- The server-side generation boundary needs clearer ownership.
- Blob write concurrency and idempotent generation behavior are not yet defined.

### Integration gaps

- Headline sources are still aspirational rather than selected.
- Essay ingestion policy is not yet defined.
- Album selection and playback link strategy are still high-level.

## Recommended first release

The first release should prove one thing: a calm, high-quality daily digest can
be generated, read, archived, and completed.

Recommended v1 feature set:

- Google sign-in.
- Today view.
- Archive view.
- Habits view.
- Settings for appearance and digest composition.
- Light and dark mode.
- Three curated palette options.
- Serif, sans, and editorial typography presets.
- On-demand digest generation.
- Stable daily snapshots.
- Manual plugin completion.
- Two initial plugin types:
  - Headlines.
  - Essay of the Day.

Optional third plugin if integration effort stays low:

- Album of the Day with outbound links only.

## Implementation order

1. App shell, auth, and protected routes.
2. User preferences and theme persistence.
3. Plugin registry and plugin instance config model.
4. Digest generation and snapshot storage.
5. Today view rendering and manual completion.
6. Archive rendering from stored snapshots.
7. Habits matrix.
8. First plugin: Headlines.
9. Second plugin: Essay of the Day.
10. Third plugin if still justified: Album of the Day.

## Review verdict

The spec is good enough to continue, but only if the team commits to a narrower
first release. The product should first prove:

- finite digest generation,
- elegant reading,
- archive fidelity,
- and completion tracking.

Most of the more ambitious source integrations should remain explicitly outside
the first shipping boundary.
