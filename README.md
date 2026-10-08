# ARENDERED

Video, photography, and media art by director Heewon Jung. A static HTML portfolio with a compact fixed header, white space, and horizontal project galleries inspired by Kontakt.

## Run

Start the local HTTP server for the portfolio and video embeds:

```sh
node server.mjs
```

Visit http://127.0.0.1:4173. No package installation or build is required.
Opening `index.html` directly redirects to this local address and preserves the current project link. Keep the server running. YouTube requires an HTTP/HTTPS page identity; a `file:` page cannot supply it. A deployed HTTP/HTTPS copy uses its own origin normally.

## Navigation

- Hover or focus a thumbnail to reveal its title over a strong translucent wash and dissolve its credits into the right column. Select it to send those credits off to the right while the image rises into the project header and the content dissolves in, with the horse loader preserved. Touch opens projects directly; reduced motion skips these animations.
- Scroll with a wheel or trackpad for HEJIK-inspired smooth motion through the horizontal gallery. Touch follows the gesture directly, and reduced motion disables the easing.
- Continue horizontally until the final credits reach the left edge, then scroll down to reach the project archive below.
- With the project title or gallery focused, use arrow keys, Page Up/Down, or Space to navigate. Home/End moves to the start/end of the gallery.
- Press Escape to return to the main archive and restore its scroll position.
- Open the upper-right + menu to see all six projects and About immediately. The menu is a compact, fully enclosed box on the right on desktop and uses the available width on phones. Project names, categories and years share aligned columns; the current page is highlighted. The plus rotates into a cross without changing stroke weight. Escape closes the drawer and restores focus.
- Each project has exactly one client/role/assets/year list, at the far right after its last image or film. The opening copy and video do not repeat metadata. Role labels distinguish direction, photography and archive work.
- Thumbnail hover previews and mobile information use the same client/role/assets/year fields; titles remain on the thumbnail overlay.
- About contains studio information and Services. Contact is a separate `#contact` page with email, phone, and Instagram links.
- On phones, project details sit below each thumbnail and crossfade as you scroll between projects. Reduced motion keeps this information fully visible. The same behavior applies to the archive after each gallery.
- Inside a project, phone introductions stack only if the image and full description fit the gallery height. Otherwise the description moves to the next horizontal column. Long copy also supports vertical scrolling within its column.
- The path by edit contains 9 distinct photographs: the retained blue-tile cover, two captioned 4:5 galleries, selected single-image frames and the final passage photograph. The supplied brick, relief and construction photographs remain excluded from the mounted sequence; original source files and numbering are retained for reversible editing.
- Use the split-circle control beside the menu to switch light/dark mode. The initial theme follows the system; a manual choice is remembered.
- Film players load immediately with muted inline autoplay and standard playback controls. Unmute in the player. Browser autoplay restrictions may require pressing the player's native play control.
- Desktop films fill the gallery height at16:9 on both laptops and external displays. Phones keep a width-bound16:9 player. RETRACE's brochure photograph fills the same desktop height as the opening cover in a4:5 crop; the selected CMF photographs retain their existing4:5 crop size.
- Project links such as `#project/path-by` can be opened directly or shared.

## Editing

| File | Contents |
| --- | --- |
| `index.html` | Page structure, studio introduction, contact details |
| `styles.css` | Colors, typography, spacing, thumbnail ratio, responsive layout |
| `app.js` | Menu, project galleries, video, navigation |
| `projects.js` | Project order, titles, client/role/assets/year, descriptions, editorial groups, images, video IDs |
| `assets/` | Optimized WebP images and source manifest |
| `DESIGN.md` | Design contract and reference adaptations |

The array order in `projects.js` controls the archive, menu, and continuation order. Add images as `{ "src": "assets/image.webp", "width": 1200, "height": 800 }`. `layout` selects gallery images by their original one-based source number; `coverImage` selects the archive/opening cover. Excluded images remain in the source catalog but are not mounted in the gallery.
Project years were confirmed by the user: CMF Master Talk, RETRACE and Hyundai Motorstudio Seoul were made in 2025; path by, MUSINSA and KT Y in 2026. Contest entries are identified explicitly rather than presented as commissioned work. English descriptions and path by captions are editorial copy based on the supplied photographs and films.

## Sources

- Layout reference: https://kontakt.press/
- Scroll reference: https://hejik.com/ (Lenis1.3.25, lerp0.085, wheel multiplier0.86; adapted to the gallery's combined horizontal/vertical reading path).
- Projects, images, and contact details: https://www.arendered.com/
- About photograph: Kong Jisu, https://www.instagram.com/p/DYHOq6gk5DG/?img_index=1, selected by the user. Provenance is recorded in `assets/about-source.json`.
- Captured: 2026-10-07
- Six public projects, six covers, and 45 gallery images. Three published videos use YouTube embeds. RETRACE displays the public photographs because its source page has no playable video URL.
- Uses Kontakt's Suisse BP Intl Regular typeface asset for the requested private design prototype, with Helvetica/Arial fallbacks. The reference source is recorded in assets/font-source.json. Kontakt logos and project images are not included.
- The founding year is omitted because the original Korean and English introductions disagree.

`scripts/import-assets.mjs` is an optional maintenance tool for importing images from the original site. It requires Sharp; set `SHARP_MODULE` to specify its module path. Running it regenerates `assets/` and `projects.js` while preserving edited copy, metadata and editorial layouts from the existing `projects.js`. Review image-number references in `layout` if the original gallery order changes.

Project images belong to the original site operator. No public redistribution license is granted.
