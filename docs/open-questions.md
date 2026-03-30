# Open Questions

These are the main questions to resolve in the next review cycle.

## Product questions

- How many plugin slots should a default digest target for a healthy reading
  session?
- What daily session length should the product optimize for?
- Should users be able to create multiple digest templates, such as weekday and
  weekend variants?
- Should completion be reversible in the archive?
- What is the right balance between summary snippets and full in-app reading for
  article plugins?

## UX questions

- Should plugin sections be swipe-driven pages, stacked sections, or a hybrid?
- How visible should archive and habit tools be from the main reading surface?
- Should theme settings be global only, or should the reader mode allow quick
  temporary overrides?
- Are plugins "pages" conceptually, or are they sections within one reading
  surface with page-like boundaries?

## Technical questions

- What Clerk instance settings, redirect URLs, and onboarding flow should
  be standardized for each deployment environment?
- What runtime should own on-demand generation, and what should later own
  scheduled generation?
- How should source credentials be stored and rotated for per-user integrations
  such as Plex?
- Do we need a relational store later for analytics or multi-user growth, or is
  Netlify Blobs sufficient for the first phase?
- How do we guarantee idempotent digest generation for the same user and date?

## Content questions

- Which news sources are licensed and practical for headline and article
  plugins?
- What is the initial curated pool for RSS-based essay recommendations?
- If album of the day is in v1, what is the initial source and selection logic?
- Which legally safe leisure-media plugins are realistic after v1?

## Review prompts for the next cycle

Use the next review to answer:

1. Does the app have the right top-level product shape?
2. Is the plugin contract strong enough to implement multiple source types?
3. Are determinism and archive requirements precise enough?
4. Which integrations are real first-release candidates versus aspirational?
5. Where do we need stricter scope cuts before implementation begins?
