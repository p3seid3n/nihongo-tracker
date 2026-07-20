# 日本語 Tracker — Deploy Guide

This is your Japanese study tracker as a real, standalone web app —
no Claude branding, true fullscreen when installed to a homescreen.

Hand this whole folder to whoever's doing the deploy (you, a teammate,
your dad). It takes about 10 minutes and is entirely free.

## Option A — Vercel (recommended, easiest)

1. Create a free account at https://vercel.com (can sign in with GitHub).
2. Install the Vercel CLI: `npm install -g vercel`
3. From inside this folder, run:
   ```
   vercel
   ```
4. Answer the prompts (defaults are fine — just hit enter through them).
5. Vercel gives you a live URL like `nihongo-tracker.vercel.app`. Done.

No GitHub needed for this option — the CLI uploads the folder directly.

## Option B — Netlify (also easy, drag-and-drop)

1. Run `npm install` then `npm run build` inside this folder.
2. Go to https://app.netlify.com/drop
3. Drag the generated `dist` folder onto the page.
4. Netlify gives you a live URL instantly.

## Option C — GitHub Pages (free, a bit more setup)

1. Push this folder to a new GitHub repo.
2. In the repo settings, enable GitHub Pages, or use the
   `gh-pages` npm package to publish the `dist` folder automatically.
3. Your app will be live at `yourusername.github.io/repo-name`.

## After it's deployed (any option)

1. Open the live URL on your phone in **Chrome**.
2. Tap the **⋮** menu → **Install and create shortcut** (or "Add to Home screen").
3. Confirm. The icon now lives on your homescreen.
4. Open it from that icon — it launches fullscreen, no browser bar,
   no Claude branding, nothing but your app.

## Important: your data

Progress is stored in the browser's `localStorage`, tied to the exact
domain you deploy to. That means:

- Always open the app from the same installed icon / same URL.
- If you redeploy to a **different** URL later, old data won't carry
  over automatically (localStorage doesn't transfer across domains).
- There's no account system and no server — your data lives only on
  this one phone, in this one browser profile. Consider that a
  single point of failure: don't clear Chrome's site data for this
  app unless you mean to.

## Project structure

```
nihongo-tracker/
├── index.html          — entry HTML, PWA meta tags
├── package.json         — dependencies (react, recharts, vite)
├── vite.config.js
├── public/
│   ├── manifest.json    — PWA name/icon/colors
│   ├── sw.js            — minimal service worker (enables install prompt)
│   └── icon-*.png       — app icons
└── src/
    ├── main.jsx         — React entry point
    └── App.jsx          — the whole app (your tracker)
```

To make changes yourself later: edit `src/App.jsx`, run `npm run dev`
to preview locally, then redeploy with the same command you used above.
