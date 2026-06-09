# Theme background images

Drop theme background images here. Each theme in `lib/themes.ts` points to a file
in this folder via its `backgroundImage` field:

- `mountain.jpg` → Mountain theme
- `beach.jpg`    → Beach theme
- `military.jpg` → Military theme

Guidance:
- Large, soft, low-contrast images work best — the band page lays a translucent
  wash of the theme background color over them (~82%) so prayers stay readable.
- Recommended ~1600×2400 (portrait), under ~300 KB each (JPG/WebP).
- Until a file exists, the band gracefully shows the solid theme color (no broken
  image). Add or rename files anytime — no code change needed.
- To point a theme at a different filename or a remote URL, edit its
  `backgroundImage` value in `lib/themes.ts`.
