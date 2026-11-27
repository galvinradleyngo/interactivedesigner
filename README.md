# Interactive Designer

Author interactive learning activities in the browser and export them as **SCORM packages** (SCORM 2004 4th Edition or 1.2) to upload to Canvas as graded assignments.

It is **local-first and works fully offline**: no accounts, no server, no database. Your work is saved in your browser, you can save and open project files, and SCORM export happens in the browser.

- Hosted app: https://galvinradleyngo.github.io/interactivedesigner/
- Single-file offline version: https://galvinradleyngo.github.io/interactivedesigner/interactive-designer-offline.html

## What works today

- **Multiple choice**: several questions per activity, single or multiple answers, per-option feedback, shuffle, retry.
- Dashboard (create, open, rename, duplicate, delete), editor with live preview that uses the real player, autosave, per-activity design (colors, font, corner radius, background image), image upload.
- SCORM export for 2004 4th Edition (default) and 1.2: score (raw/min/max, plus scaled for 2004), completion, pass/fail against your passing score, resume via `suspend_data`. Exported packages make no network requests.
- Project files (`.idproject.json`) with images embedded, for backups and for sharing work between designers.

Planned next: True/False, Fill in the blanks, Hotspots, Drag-and-drop, Flash cards, Image comparison, Timeline, Interactive Video (YouTube), Branching, Game map, Crossword, Word search, Memory game, with a drag-and-resize stage editor for designers.

## Using it offline

You have two options, and both work in any modern browser (Chrome, Edge, Firefox, Safari).

**A. Single HTML file (works anywhere, no install).** Download `interactive-designer-offline.html` from the link above (the dashboard also links to it), keep it anywhere on your computer, and double-click it. Nothing else is needed, and it needs no internet at all.

**B. Install the hosted app.** Open the hosted site once while online. It then works offline, even after closing the browser. In Chrome or Edge you can also click the install icon in the address bar to get an app window (Safari: Share → Add to Dock/Home Screen). Updates arrive automatically the next time you open it online.

### Where your work is saved

Activities are saved automatically in **this browser, on this device** (IndexedDB). Things to know:

- Each way of opening the app has its **own** storage. The hosted site, the installed app and the single HTML file do not share activities, and some browsers store file-based data separately per file location. Moving or renaming the HTML file can look like "my activities are gone".
- Browsers can clear site data (clearing history, private windows, low disk space).
- So **back up regularly**: **Back up all** on the dashboard downloads every activity in one file, and **Export project** downloads one. **Open project file…** loads either kind (including from another computer or another way of opening the app).
- To hand an activity to a colleague, send them its project file.

## Publishing the hosted version (GitHub Pages)

1. Repository → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Merge the branch into `main` (open a pull request on GitHub and merge it).
3. The workflow `.github/workflows/deploy.yml` lints, tests, builds and deploys to https://galvinradleyngo.github.io/interactivedesigner/ (it also publishes the single-file version alongside). You can also run it manually from the **Actions** tab.

There are no secrets, environment variables or Firebase setup.

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173/interactivedesigner/
npm test
npm run lint
npm run typecheck
npm run build        # builds dist/ (site, service worker, single-file version)
```

## Test the package on SCORM Cloud, then Canvas

1. In the editor, set the **passing score** and **SCORM version**, then click **Export SCORM**. A `.zip` named after the activity title downloads.
2. **SCORM Cloud test:** create a free account at <https://cloud.scorm.com> → **Add Content → Import a course** → choose the zip → **Launch**. Complete the activity and check that the registration shows the score, completion and passed/failed.
3. **Canvas:** in your course, use your institution's SCORM tool (the exact name depends on how it's set up) → **Upload** → choose the zip → **Import as Graded Assignment** (set the points). Students' scores come from the SCO's reported score.

If Canvas doesn't offer SCORM at your institution, ask your Canvas administrator which SCORM tool is installed.

## How it's built

- `src/schema` versioned content schema (`schemaVersion`) with `migrate()`, plus the HTML sanitizer.
- `src/plugins/<type>` one folder per activity type: type definition and scoring (`type.ts`, `score.ts`), React editor (`Editor.tsx`), player renderer (`player.ts`).
- `src/player` framework-free player, built by `vite.player.config.ts` into one `player.js` and one `player.css`. The same bundle runs the in-app preview and the exported package, and it is embedded in the app so nothing is fetched at export time.
- `src/scorm` API discovery, SCORM 1.2 and 2004 adapters, reporter, `suspend_data`, manifest generation.
- `src/app` the authoring app (HashRouter, IndexedDB store, project files, export with JSZip).
- `scripts/make-sw.mjs` generates the service worker that precaches the app. `vite.single.config.ts` builds the single-file version.
- `examples/` a sample activity JSON per type (you can open these with **Open project file…**).

### Package layout

`imsmanifest.xml`, `index.html`, `player.js`, `player.css`, `content.json`, `media/…`. The activity data is also embedded in `index.html`, so it loads even from `file://`.
