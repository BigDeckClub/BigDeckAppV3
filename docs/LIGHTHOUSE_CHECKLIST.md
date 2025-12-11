## Lighthouse Checklist — Phase 6

Purpose: quick checklist to improve performance, accessibility, and best practices.

- [ ] Preload key fonts to reduce FOIT/FOUT and CLS (see `index.html`).
- [ ] Serve images with `loading="lazy"` where appropriate (CardTile updated).
- [ ] Use responsive `srcset`/`sizes` for critical images.
- [ ] Minimize render-blocking CSS; ensure Tailwind build extracts used classes.
- [ ] Ensure all interactive elements have accessible names (aria-labels, visible text).
- [ ] Add skip-to-content link for keyboard users.
- [ ] Add semantic HTML and landmarks (`header`, `main`, `footer`, `nav`).
- [ ] Ensure color contrast meets WCAG AA for normal text.
- [ ] Add server-side caching and proper Cache-Control for static assets.
- [ ] Audit third-party scripts and defer or lazy-load non-critical analytics.
- [ ] Measure Lighthouse scores (desktop/mobile) and add before/after screenshots to PR.

Run locally:

```bash
# start dev build
npm run build
# run server
node server.js
# Visit site and run Lighthouse in Chrome DevTools
```
