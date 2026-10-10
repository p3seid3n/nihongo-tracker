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
* **Today:** reviews first, new cards woven in, then the next grammar lesson, a grammar refresher, and sentence practice built from your own vocabulary cards.
* **Lessons:** 45 lessons in the order of Tae Kim's Guide (CC BY-NC-SA 3.0, personal non-commercial use with attribution). Explanations and example sentences are written for this app. Practice sentences are generated from a word bank and weighted towards words you are shaky on. Lessons are scheduled with FSRS too, so grammar comes back for review. Units can be tested out of. Most pages carry a reference table (`src/content/tables.js`, plus the tables written into the lessons). The toggle under a lesson's title switches between the Kotoba explanation and Tae Kim's: his text is not copied into the app, the Tae Kim view links to the matching section on guidetojapanese.org (needs a connection) and lists what the lesson covers. Matching exercises work from either column, and after an answer the full sentence is shown with word glosses, a translation and audio.
* **Kanji font:** Settings → Reading and look. Classic (the system's Mincho, default), Clear (Noto Sans JP) and Textbook (Klee One). The two extra fonts are SIL OFL, copied from the `@fontsource` packages into `public/fonts/` by `scripts/build-fonts.mjs` (runs on build), split into small slices and fetched the first time they are needed, then cached for offline use.
* **Layout:** full-screen views (study, lessons, import) never scroll as a whole page; only their content area does, so the top bar and the answer buttons stay put, and the page behind sheets is locked. Lesson and exercise buttons sit in their own footer below the scrolling content.
* **Leaving:** closing a full-screen view animates the view you were on (it stays mounted until it has left); sheets slide away when removed by their parent; lesson pages slide from the right going forward and from the left going back.
* **Furigana:** shown only for kanji you have not learned yet (kanji cards you graduated, plus kanji in well-known words). Change in Settings.
* **Sync:** offline-first. Each part of your data (settings, decks, progress per deck, review log per month) is merged by timestamp, so two devices never overwrite each other's reviews. Signing in on a device that already has data asks whether to combine or replace.
* **Motion:** follows Material 3 Expressive. Movement of things (cards, sheets, the nav pill, bars) uses springs that overshoot slightly; fades and colour use springs that settle without bounce. The spring curves are generated as CSS `linear()` easings (`npm run springs` regenerates `src/springs.css`). Sheets can be dragged down and settle with the speed of your finger. Settings → Animations → Reduced (or your device's reduce-motion setting) turns it down.
* **Haptics:** a light tick on every control, patterns for Again / Hard / Good / Easy, right and wrong answers, and finishing. Android (Chrome) uses the Vibration API. iPhone Safari 17.4 and newer has no vibration API, so a hidden switch control is toggled to get the system tick. Desktop browsers don't vibrate. Settings → Haptic feedback has a test row.
* **Sentence practice:** mixed exercises from the example sentences of cards you have started: match words, pick the meaning, fill the gap, choose the right form of a verb or adjective (or the sentence that matches the English), and build the Japanese from tiles. Every sentence is segmented against your decks (`src/lib/lexicon.js`). A sentence is only used when every word is in one of your decks and at most four words, forms or grammar points are not learned yet; those get a small English gloss above them. Grammar counts as learned once its lesson is done. Tap any word for a popup with reading, meaning, the weakest kanji's story, and a speaker button. Limits: roughly two thirds of Kaishi's sentences are fully explainable; early on, before the grammar lessons are done, many words show glosses and some sentences are skipped; particle-swap questions are deliberately not generated because the wrong particle can still make a valid sentence.
* **Listening:** by default cards read the word when they appear and the example sentence when you reveal the answer. Settings → Listening and speaking lets you read the word on card open, with the answer, or never, and the sentence with the answer or never. Without recordings the phone's Japanese voice is used. If the device has no Japanese voice the app stays silent instead of reading Japanese with the wrong voice; Settings explains how to install one.
* **Pronunciation check:** the microphone button on a card listens through the browser's speech recognition (ja-JP) and compares what it heard with the word or sentence, character by character, with a score. Kanji written in kana by the recogniser still count when the reading is known. Limits: Chrome/Android sends the audio to Google's recogniser, so it needs a connection; Safari and installed iPhone apps may not allow recognition at all, in which case the sheet falls back to recording you so you can compare by ear.
* **Writing practice:** "Write N characters" on Today, plus a pen button on kana and kanji cards. Trace with a stroke-by-stroke guide, or write from memory; strokes must be drawn in the right order and direction (the app says which stroke was expected), with hints and an animated demo. Stroke data is KanjiVG (© Ulrich Apel, CC BY-SA 3.0), built into `public/strokes/` by `node scripts/build-strokes.mjs`, fetched per character when first needed and cached for offline use.
* **Recall cards:** once a vocabulary word has stayed in your memory for 4 days (Settings → Pace → Start recall after), it also gets a recall card: you see the meaning and give the Japanese. Type romaji or kana (romaji turns into kana as you type; typing the kanji also counts). Exact answers suggest Good, one slip in a word of four or more kana suggests Hard, anything else Again, and you still choose the grade. A recall card is a second schedule for the same word (`deck.key~p` in the same `prog` slice, so it syncs like any other card) with no learning steps. Switch off or limit in Settings. Not built: speaking the answer instead of typing it.
* **Effort budget:** every answer costs points (review 1, new card 2, recall review 3, new recall card 4) and a day has a budget (Settings, default 200). When it runs out, the rest waits for tomorrow, with "Keep going anyway" if you want more. The Today screen shows the meter. `src/lib/effort.js`, `src/lib/queue.js`.
* **Slow-down for new cards:** new cards (and new recall cards) are scaled down while the due work is more than half the budget (to zero at a full budget) and while recall over the last 7 days is under 80 % (zero under 70 %, with at least 30 answers). Today says how many were held back and why. Asking for "5 more new cards" overrides it. Settings can turn it off.
* **Leech rescue:** after the 8th lapse of a card (then every 4th) a sheet asks for a mnemonic of your own and shows the stories of its kanji and other sentences with the word. The mnemonic is stored as `note` on the card's progress record, shown on the back, and editable from any card (pencil link). Or suspend the card.
* **More sentences per word:** the back of a vocabulary card cycles through its own sentence and others from your cards in which every other word and grammar point is something you already know (`src/lib/sentenceIndex.js`, built in the background when a session opens).
* **Weak spots:** at the end of a session, up to 6 cards you missed twice in the last three days (and that aren't due today) come back once more. Settings can turn it off.
* **Pitch accent:** Kaishi's pitch field is read on import and shown on the back of vocabulary cards (overline, step down, and the pattern name). Decks imported before 4.4 need the same file imported again; progress is kept. Content from another device that has pitch is merged in on sync.
* **Reading:** 20 short texts written for this app (Today → Reading, or the Grammar tab), from "My family" to a trip to Kyoto. Each shows a coverage bar: how much of the text is words and grammar you already know. Research suggests about 95–98 % known words for comfortable reading; the texts are short and every new word is glossed, so the shaded 90–97 % band is the target here and "Next up" suggests the unread text closest to it. Tap any word for the reading, meaning and kanji story; new words get a small English gloss above them (switchable); the English translation can be shown per line or for all; every line has its own speaker, and Listen reads the whole text. "New in this text" lists what is not learned yet. "I read it" is stored like a lesson (`read.<id>`) and counts as activity in the effort meter. The texts and their extra vocabulary are in `src/content/reader.js`; the maths is `src/lib/reader.js`.
* **Writing prompts:** 12 prompts (Grammar tab → Writing prompts). Write a few sentences (romaji turns into kana as you type, `.` becomes 。), press Check, and the app lists the words and forms you used that you have not learned yet, grammar from lessons you have not done, anything it can't find, and which of the suggested words you used; then it shows one way to say it. It checks what you used, not whether the Japanese is correct (`src/lib/outputCheck.js`).
* **Lexicon changes in 4.5:** 〜たい forms (買いたかった) are understood, adjacent kanji words that the furigana separates (毎朝六時) stay two words, and lesson-bank words typed in kana (がくせい) are found.
* **Backups:** Settings → Export backup (JSON). Restore merges.

## Development

```
npm install
npm run dev        # local
npm test           # unit tests (517)
npm run build
node scripts/make-icons.mjs   # regenerate icons
node scripts/build-strokes.mjs # regenerate public/strokes from KanjiVG
# browser tests (need Chromium; start `npx vite preview --port 4173` first)
node tests/e2e/flow.mjs   # also: onboarding, import, import2, practice, writing, audio, offline, cloud, sentences, layout, settings-prefs, lessons2, recall, reader
```

Keyboard in a study session: Space = show answer / Good, 1–4 = grade, Z = undo.
