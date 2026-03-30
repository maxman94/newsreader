# Spec Review 02

Date:

- 2026-03-29

Scope:

- Convert major open questions into concrete proof-of-concept decisions.

Outcome:

- The v1 proof of concept is now materially narrower and more implementable.
- AP headlines and configurable RSS feed lists are the first real content
  inputs.
- AI is used for editorial selection, not summarization.

## Accepted decisions

### D-013: Rights assumed for the proof of concept

- Status: accepted for POC only.
- Decision: treat content display rights as assumed during the proof of concept.
- Constraint: this does not remove the need for a later rights review before any
  public or durable release.

### D-014: Session target by page type

- Status: accepted.
- Decision: default digest pages should target roughly 5 to 10 minutes of
  reading time each.
- Exception: some bounded leisure plugins, such as album or manga volume pages,
  may intentionally run 20 to 60 minutes.

### D-015: Paged reading model

- Status: accepted.
- Decision: the core reading surface is page-based, not an open-ended stacked
  feed.
- Rationale: page boundaries reinforce progress, completion, and session
  finiteness.

### D-016: Simple Google OAuth for v1

- Status: accepted.
- Decision: use a simple Google OAuth path for the first implementation rather
  than designing a provider-agnostic auth abstraction upfront.
- Constraint: internal interfaces should still avoid hard-coding Google details
  throughout the app.

### D-017: AI selects content, it does not summarize content

- Status: accepted.
- Decision: AI is used to choose candidate stories and essays from fetched
  source inputs.
- Constraint: the displayed content remains source content, not AI summaries.

### D-018: Decision logs are stored for auditability

- Status: accepted.
- Decision: every AI-assisted selection stores a short decision log that records
  what candidates were considered, what was chosen, and why.
- Rationale: this is necessary for trust, tuning, and archive fidelity.

### D-019: AP headlines use full story content in the POC

- Status: accepted.
- Decision: for the proof of concept, AP stories are treated as short enough to
  render in full on the page once selected.

### D-020: First source strategy

- Status: accepted.
- Decision: start with:
  - AP for headlines.
  - Configurable RSS feed lists for essay selection.
- Rationale: this is the smallest source set that still proves the product’s
  mix of current awareness and long-form reading.

### D-021: Lightweight reader approach

- Status: accepted.
- Decision: source ingestion should begin as a lightweight server-side reader
  that consumes AP HTML and essay RSS feeds rather than a heavier ingestion
  pipeline.
- Constraint: fetched outputs still need normalized candidate records and
  stable stored snapshots.

## Revised v1 boundary

The effective proof-of-concept v1 now includes:

- Simple Google sign-in.
- Page-based digest reading.
- AP headlines page selected by AI from scraped AP candidates.
- Essay page selected by AI from configurable RSS feeds.
- Stored daily snapshot.
- Stored decision log for each AI selection step.

The effective proof-of-concept v1 does not require:

- AI summarization.
- Generic full-text article support across arbitrary publishers.
- Comics, manga, funny pages, or Plex.
- Sophisticated scheduling before on-demand generation works.

## Immediate build implications

- The backend needs a candidate normalization layer for AP HTML and RSS feeds.
- The OpenAI integration should return structured selection outputs.
- Storage should persist both digest results and selection logs.
- The UI should present digest pages as finite reading units with visible page
  position.
