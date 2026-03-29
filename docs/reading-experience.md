# Reading Experience

## Visual direction

The product should feel editorial, quiet, and premium. It should evoke a modern
literary digest more than a conventional news app.

Target attributes:

- High legibility.
- Moderate information density.
- Strong hierarchy without visual shouting.
- Restrained color usage.
- Minimal chrome around reading content.

Avoid:

- Breaking-news television aesthetics.
- Hyperactive cards and badges.
- Feed-like endless stacking.
- Aggressive engagement patterns.

## Personalization model

Customization should improve comfort without turning the app into a skinning
engine.

Supported controls:

- Light mode and dark mode.
- Named palette presets.
- Typography presets.
- A small number of reading density controls.

## Color schemes

Initial named palettes:

- `default`: neutral editorial baseline.
- `sepia`: warm paper-like reading mode.
- `nord`: cool, low-noise contrast.
- `catppuccin`: softer expressive palette with good dark-mode behavior.
- `everforest`: muted natural palette tuned for long reading.

Each palette should provide:

- Background colors.
- Surface colors.
- Text colors.
- Accent colors.
- Border and divider colors.
- Semantic colors for success, warning, and failure states.

## Contrast guidance

- Each palette must work in both light and dark modes where practical.
- Contrast should meet accessibility requirements, while preserving a calm,
  print-like reading feel.
- Provide at least a standard contrast mode and a higher contrast option for
  users who need stronger separation.

## Typography

Typography should treat the app like a publication.

Proposed controls:

- Serif, sans, and editorial hybrid presets.
- Font size scale.
- Line height preference.
- Measure preference, such as compact, standard, and spacious.

Potential use:

- Serif body with restrained sans UI chrome.
- Strong headline hierarchy with generous spacing.
- Distinct article metadata styling.

## Layout principles

- Mobile-first single-column reading is the default.
- Plugin sections should feel page-like, with explicit boundaries.
- Desktop layouts may add margins, side notes, or progress rails, but should not
  collapse into a dashboard.
- Digest progress should remain visible without dominating the page.

## Motion

- Use subtle transitions between sections and modes.
- Prefer intentional page transitions over constant micro-animation.
- Motion should reinforce calm progress through a finite digest.
