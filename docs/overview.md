# Newsreader Docs

This folder is the working spec for the Newsreader app.

The product is a mobile-first single page app for a finite daily digest. The
goal is to replace open-ended doomscrolling with a constrained, elegant reading
experience that feels editorial, calm, and habit-forming.

## Document map

- `product-brief.md`: product vision, audience, and success criteria.
- `feature-map.md`: feature breakdown by user-facing area.
- `requirements.md`: functional and non-functional requirements.
- `user-flows.md`: key user journeys and app information architecture.
- `reading-experience.md`: visual, typography, and theming requirements.
- `plugin-architecture.md`: plugin lifecycle, interfaces, and execution model.
- `core-plugin-catalog.md`: first-party plugin concepts and their expected
  behavior.
- `curated-sources.md`: seed editorial sources for essay, newsletter, and
  similar recommendation-driven plugins.
- `data-model.md`: storage model, digest snapshots, and completion tracking.
- `integrations.md`: external services and source-specific considerations.
- `decision-log.md`: explicit architectural and product decisions made so far.
- `open-questions.md`: unresolved items for iteration and gap analysis.
- `review-cycle.md`: the planned iteration, gap analysis, and spec review flow.
- `spec-review-01.md`: first review pass with accept, revise, defer, and cut
  decisions for v1.

## Product summary

Newsreader is a digest reader, not an infinite feed:

- Each digest is date-bound and finite.
- Content is assembled from user-selected plugins.
- Plugins typically occupy one digest page or section.
- Plugin output is snapshotted so users can revisit prior days.
- Completion state is tracked to build habit history over time.

## Scope baseline

Initial scope assumes:

- Mobile-first SPA built with React and Vite.
- Netlify-hosted frontend and server routes/functions.
- User settings persisted in Netlify Blobs.
- Google OAuth as the first authentication provider.
- Plugin-based digest assembly with per-plugin configuration.

## Review goal

This documentation set should support the next cycle:

1. Iteration review.
2. Gap analysis.
3. Spec refinement before implementation.
