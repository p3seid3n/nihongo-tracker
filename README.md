# Kotoba (Nihongo Tracker 4)

The app is called **Kotoba** on the home screen (`name`/`short_name` in `public/manifest.webmanifest`, plus `<title>` and `apple-mobile-web-app-title` in `index.html`). The icon is a brush-stroke 言 drawn from KanjiVG stroke data: `node scripts/make-icons.mjs`.

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
* **Audio:** if the deck has recordings (Kaishi has word and sentence audio), the wizard offers "Include audio". The clips are unpacked into the browser's own storage (about 2,900 clips for Kaishi, a minute at most) and play instead of the built-in voice. Importing the same file again later adds audio to a deck you already imported without touching your progress. Audio stays on that device and is not synced; Settings → Listening and speaking shows the size and can remove it.

## How it works

* **Scheduler:** FSRS-6 with the default weights, learning steps 1 m / 10 m, relearning 10 m, day starts at 4 am, deterministic fuzz, target retention 85/90/95 % (Settings).
* **Today:** reviews first, new cards woven in, then the next grammar lesson, a grammar refresher, and sentence reading from your own vocabulary cards.
* **Lessons:** 45 lessons in the order of Tae Kim's Guide (CC BY-NC-SA 3.0, personal non-commercial use with attribution). Explanations and example sentences are written for this app. Practice sentences are generated from a word bank and weighted towards words you are shaky on. Lessons are scheduled with FSRS too, so grammar comes back for review. Units can be tested out of.
* **Furigana:** shown only for kanji you have not learned yet (kanji cards you graduated, plus kanji in well-known words). Change in Settings.
* **Sync:** offline-first. Each part of your data (settings, decks, progress per deck, review log per month) is merged by timestamp, so two devices never overwrite each other's reviews. Signing in on a device that already has data asks whether to combine or replace.
* **Motion:** follows Material 3 Expressive. Movement of things (cards, sheets, the nav pill, bars) uses springs that overshoot slightly; fades and colour use springs that settle without bounce. The spring curves are generated as CSS `linear()` easings (`npm run springs` regenerates `src/springs.css`). Sheets can be dragged down and settle with the speed of your finger. Settings → Animations → Reduced (or your device's reduce-motion setting) turns it down.
* **Haptics:** a light tick on every control, patterns for Again / Hard / Good / Easy, right and wrong answers, and finishing. Android (Chrome) uses the Vibration API. iPhone Safari 17.4 and newer has no vibration API, so a hidden switch control is toggled to get the system tick. Desktop browsers don't vibrate. Settings → Haptic feedback has a test row.
* **Listening:** cards read the word when they appear and the example sentence when you reveal the answer (switch off in Settings). Without recordings the phone's Japanese voice is used. If the device has no Japanese voice the app stays silent instead of reading Japanese with the wrong voice; Settings explains how to install one.
* **Pronunciation check:** the microphone button on a card listens through the browser's speech recognition (ja-JP) and compares what it heard with the word or sentence, character by character, with a score. Kanji written in kana by the recogniser still count when the reading is known. Limits: Chrome/Android sends the audio to Google's recogniser, so it needs a connection; Safari and installed iPhone apps may not allow recognition at all, in which case the sheet falls back to recording you so you can compare by ear.
* **Writing practice:** "Write N characters" on Today, plus a pen button on kana and kanji cards. Trace with a stroke-by-stroke guide, or write from memory; strokes must be drawn in the right order and direction (the app says which stroke was expected), with hints and an animated demo. Stroke data is KanjiVG (© Ulrich Apel, CC BY-SA 3.0), built into `public/strokes/` by `node scripts/build-strokes.mjs`, fetched per character when first needed and cached for offline use.
* **Backups:** Settings → Export backup (JSON). Restore merges.

## Development

```
npm install
npm run dev        # local
npm test           # unit tests (414)
npm run build
node scripts/make-icons.mjs   # regenerate icons
node scripts/build-strokes.mjs # regenerate public/strokes from KanjiVG
# browser tests (need Chromium; start `npx vite preview --port 4173` first)
node tests/e2e/flow.mjs   # also: onboarding, import, import2, practice, writing, audio, offline, cloud
```

Keyboard in a study session: Space = show answer / Good, 1–4 = grade, Z = undo.
