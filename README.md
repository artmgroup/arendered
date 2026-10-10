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
- Scroll with a wheel or trackpad for HEJIK-inspired smooth motion through the horizontal gallery. Horizontal touch gestures use native browser scrolling and momentum. A vertical gesture inside the gallery advances it directly and stops at its horizontal edge; the next vertical gesture scrolls the archive with native browser momentum. Archive touches never reset the gallery or document position. Safari and embedded-browser toolbar height changes leave mobile gallery geometry stable. Mobile players do not use the desktop scroll buffer.
- Continue horizontally until the final credits reach the left edge, then scroll down to reach the project archive below.
- With the project title or gallery focused, use arrow keys, Page Up/Down, or Space to navigate. Home/End moves to the start/end of the gallery.
- Press Escape to return to the main archive and restore its scroll position.
- Open INDEX at the upper right for Selected Works. Its typography matches the ARENDERED wordmark. On desktop, a paper sheet occupies the right 52% of the screen with aligned project/client/assets/year columns. A 10px inset on both sides keeps the hover/current highlight clear of the text. On phones, a full-width sheet shows each project and year above its client and assets in compact rows with a 60px minimum height. The first row has the same rule-to-text spacing as subsequent rows. Long titles wrap and grow their row. The sheet owns native scrolling, keeps the page's reading position, and fades open and closed. Escape closes it and restores focus to INDEX.
- Each project has exactly one client/role/assets/year list, at the far right after its last image or film. The opening copy and video do not repeat metadata. Role labels distinguish direction, photography and archive work.
- Production credits follow the year after one empty body line, only in the final credits column. Names and role labels use the supplied project-specific credits. Title/subtitle pairs use the visual gap of one ordinary space, preserving paragraph breaks in the copy.
- Thumbnail hover previews and mobile information use the same client/role/assets/year fields; titles remain on the thumbnail overlay.
- About contains studio information and Services. Contact is a separate `#contact` page with email, phone, and Instagram links.
- On phones, project details stay fully visible below each thumbnail as you scroll, including in the archive after each gallery. No per-scroll fade or translation runs.
- Inside a project, phone descriptions occupy the next horizontal column beside the image. Text columns, captions and final credits fit the current visible screen height and support native vertical reading when needed. Safari toolbar changes resize these reading areas without changing the image or horizontal gallery geometry.
- The path by edit contains 9 distinct photographs: the retained blue-tile cover, two captioned 4:5 galleries, selected single-image frames and the final passage photograph. The supplied brick, relief and construction photographs remain excluded from the mounted sequence; original source files and numbering are retained for reversible editing.
- Use the split circle to switch light/dark mode, or the matching circled i to open About. Both icons share their diameter, stroke and alignment with the header's first line; controls only tint slightly on hover. The initial theme is light; a manual choice is remembered.
- Theme changes interpolate the open index paper, text, secondary labels, rules and row washes together over 420ms (100ms with reduced motion), without changing menu position or opacity. Ordinary hover feedback keeps its 160ms duration.
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

The array order in `projects.js` controls the archive, menu, and continuation order: Hyundai Motorstudio Seoul, CMF Master Talk, RETRACE, path by, MUSINSA MUJINJANG, KT Y. Add images as `{ "src": "assets/image.webp", "width": 1200, "height": 800 }`. `layout` selects gallery images by their original one-based source number; `coverImage` selects the archive/opening cover. Excluded images remain in the source catalog but are not mounted in the gallery.
Project years were confirmed by the user: CMF Master Talk, RETRACE and Hyundai Motorstudio Seoul were made in 2025; path by, MUSINSA and KT Y in 2026. Contest entries are identified explicitly rather than presented as commissioned work. English descriptions and path by captions are editorial copy based on the supplied photographs and films.

When changing project order or behavior, update the corresponding request versions in `index.html` so returning visitors receive the same source. Image priority follows the visible route: the first archive covers are eager on the archive, the opening project image is eager inside its project, and continuation cards are lazy.
Gallery photographs load one screen ahead of the horizontal viewport. Archive covers load near the vertical viewport. Observers release images after loading and when project frames are replaced, so hidden archives and distant photographs do not compete with the opening image.

Responsive cover files at 480/960/1280px preserve the original aspect ratio and keep the original photograph as the largest candidate. Gallery source photographs are unchanged. Run `scripts/build-cover-variants.py --report .omo/evidence/cover-variants.json` with Pillow and apply the resulting `srcset` and `sizes` to each project cover. The complete Suisse font is compressed as WOFF2 with its existing OTF fallback.

The favicon uses the supplied red zoopraxiscope disc. `scripts/create-site-icons.py SOURCE.png --font assets/suisse-intl-regular.otf` generates a multi-size ICO, browser PNGs, Apple touch icon, maskable icon and WOFF2 font; Pillow, fontTools and Brotli are maintenance dependencies only. Relative icon and manifest URLs work under the GitHub Pages `/arendered/` path.

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
