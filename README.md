# Nihongo Tracker 4

A homescreen web app (PWA) for learning Japanese: spaced repetition (FSRS) for kana, kanji and vocabulary, interactive grammar lessons that adapt to the words you know, stats, and sync between devices.

## Put it online (GitHub → Vercel, as before)

1. Open your GitHub repo `p3seid3n/nihongo-tracker` in the browser. Delete the old files (or just upload over them), then drag **the contents of this folder** (not the folder itself, and without `node_modules` / `dist`) into the repo and commit. The build step removes leftovers of the old version by itself.
2. Vercel redeploys automatically. Settings stay the same (Framework: Vite, build `npm run build`, output `dist`).
3. On your phone: if the old app still shows, close it fully and reopen. If it is stuck, remove it from the home screen and add it again (Safari → Share → Add to Home Screen), or clear the site data for the domain once.

The app works fully without step "Cloud sync" below. Everything is stored on the device.

## Cloud sync and login (about 10 minutes, free)

1. Create a project at supabase.com (free plan is enough).
2. Dashboard → SQL Editor → New query → paste the contents of `supabase.sql` → Run.
3. Dashboard → Project Settings → API: copy the **Project URL** and the **anon public key**.
4. Vercel → your project → Settings → Environment Variables. Add
   `VITE_SUPABASE_URL` = the Project URL
   `VITE_SUPABASE_ANON_KEY` = the anon key
   then Deployments → Redeploy.
5. Supabase → Authentication → URL Configuration: set **Site URL** to your Vercel address (`https://nihongo-tracker-kappa.vercel.app`). Needed for the confirmation and password-reset emails.
6. In the app: Settings → Sign in or create account. Use the same account on every device.

The anon key is meant to be public. Your data is protected by row-level security from `supabase.sql`: each account can only see its own rows.

## Importing your Anki decks

Cards tab → Import (or the button on Today). Pick the `.apkg`. Parsing happens on the device; a 146 MB export took about one second in testing.

* If you export from Anki with **"Include scheduling information"** ticked, your progress is kept (FSRS stability and difficulty are read when present).
* Your current export has no scheduling. For each deck enter how many cards you already know, in order (e.g. RRTK 315, Kaishi 41). They come back for a quick check spread over 10 days.
* An imported Hiragana/Katakana deck pauses the built-in one so you don't study both.

## How it works

* **Scheduler:** FSRS-6 with the default weights, learning steps 1 m / 10 m, relearning 10 m, day starts at 4 am, deterministic fuzz, target retention 85/90/95 % (Settings).
* **Today:** reviews first, new cards woven in, then the next grammar lesson, a grammar refresher, and sentence reading from your own vocabulary cards.
* **Lessons:** 45 lessons in the order of Tae Kim's Guide (CC BY-NC-SA 3.0, personal non-commercial use with attribution). Explanations and example sentences are written for this app. Practice sentences are generated from a word bank and weighted towards words you are shaky on. Lessons are scheduled with FSRS too, so grammar comes back for review. Units can be tested out of.
* **Furigana:** shown only for kanji you have not learned yet (kanji cards you graduated, plus kanji in well-known words). Change in Settings.
* **Sync:** offline-first. Each part of your data (settings, decks, progress per deck, review log per month) is merged by timestamp, so two devices never overwrite each other's reviews. Signing in on a device that already has data asks whether to combine or replace.
* **Backups:** Settings → Export backup (JSON). Restore merges.

## Development

```
npm install
npm run dev        # local
npm test           # unit tests (378)
npm run build
node scripts/make-icons.mjs   # regenerate icons
# browser tests (need Chromium; start `npx vite preview --port 4173` first)
node tests/e2e/flow.mjs
```

Keyboard in a study session: Space = show answer / Good, 1–4 = grade, Z = undo.
