# Interactive Designer

Build interactive learning activities in the browser and export them as **SCORM packages** (SCORM 2004 4th Edition or 1.2) to upload to Canvas, as a page, an ungraded assignment or a graded assignment.

It is **local-first and works fully offline**: no accounts, no server, no database. Your work is saved in your browser, you can save and open activity files, and SCORM export happens in the browser.

- Hosted app: https://galvinradleyngo.github.io/interactivedesigner/
- Single-file offline version: https://galvinradleyngo.github.io/interactivedesigner/interactive-designer-offline.html

## What works today

You make **activities**. An activity is one or more pages; every new activity starts as one blank canvas that you fill with elements and interactions and arrange freely.

- **Elements:** text (type directly on the canvas), image, shape, button (go to the next page, the previous page or a specific page).
- **Interactions:** multiple choice, drag and drop (labelling, sorting, sequencing), hotspots (click points on an image to reveal text or pictures, or a "find the spot" self-check), flash cards, flip card (a shape with text and/or a picture that turns over when clicked), timeline (horizontal or vertical), image comparison slider, and **interactive video** (a YouTube video that pauses at checkpoints for prompts and multiple-choice questions the learner must answer to continue).
- **One page = no Back/Next.** Navigation buttons only appear when an activity has more than one page.
- **Grading is off by default.** The switch in the top bar (and the **Grading** tab) turns it on. When it is off, learners see no scores, points, percentages or pass/fail, and only completion is sent to the LMS. When it is on, **only multiple choice, drag and drop and the questions in an interactive video can be graded** (flip cards, hotspots, timelines, flash cards and the comparison slider are for learning, not marks). In the Grading tab you pick which of those count, give each its points, and set the passing score; the learner's score is the share of the total points they earn.
- **Page shape:** widescreen 16:9 (default), 4:3, square, portrait tablet or portrait phone, so you can design for how learners will hold their device.
- **Preview** at Desktop, Tablet or Phone size, in portrait or landscape, before you export.
- **Blends into the course page:** the area around the page is transparent by default; Settings has an optional "Background around the page" colour.
- **SCORM export** for 2004 4th Edition (default) and 1.2: score (raw/min/max, plus scaled for 2004) when graded, completion, pass/fail when graded, resume via `suspend_data`. Exported packages make no network requests.
- **Folders:** organize activities into folders from the dashboard, move activities between them, **duplicate** an activity, and download everything in a folder in one go (as a zip of SCORM packages, or as one activity file).
- Activity files (`.idactivity.json`) with images embedded, for backups and for sharing work between designers (they remember which folder an activity was in). Older files and saved work open automatically.

Planned next: True/False, Fill in the blanks (both gradable), open-ended questions in interactive video, Branching, Game map, Crossword, Word search, Memory game, audio, multi-select and rotation.

## Using the editor

1. **New activity** on the dashboard opens a blank canvas. If you have a folder open, the new activity goes into it.
2. **Add** (left panel): click an element or an interaction to place it on the page. **Pages** adds, renames, reorders and duplicates pages. **Layers** shows the stacking order and lets you hide or lock things.
3. **Move and resize** by dragging; handles resize (hold Shift on a corner to keep proportions). Edges and centres snap to the page and to other elements (hold Alt to bypass, or switch Snap off). Arrow keys nudge by 1 (Shift: 10).
4. **Edit text** by double-clicking it. **Edit an interaction on the canvas** by double-clicking it (or **Edit on canvas** in the panel):
   - Hotspots: double-click the image to add a hotspot, drag markers to move them.
   - Drag and drop: drag items and zones into place and use the handles to resize (double-click adds an item; Shift+double-click adds a zone). Set which zone each item belongs in from the panel.
   - Flip card: tick **Show the back on the canvas** to design the back side. Copy and paste (or Duplicate) a card to make a grid of them.
   - Interactive video: paste a YouTube link, then double-click the video (or press **Place checkpoints on the canvas**). Under the video is a timeline: click it to move the video, press **Question at…** or **Prompt at…** to add a checkpoint where the video is (load the video to play it first), and drag a checkpoint to retime it. You can also type a checkpoint's time in the panel.
5. The right panel has **Element** (position, size, order, lock and the interaction's content), **Page** (name, background), **Grading** (the graded switch, passing score and each gradable interaction's points) and **Settings** (title, SCORM version, feedback, retry, page shape, colours, font).
6. **to finish** (top bar) lists interactions that are empty or incomplete, such as a hotspots block with no image, and jumps to each one. Previewing one that is not set up explains what is missing instead of showing a blank slide.
7. **Preview** plays the activity as a learner would, at the device size you choose. **Duplicate** copies the activity. **Export SCORM** downloads the zip.

Shortcuts: Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl+Y redo, Ctrl/Cmd+C/V copy and paste, Ctrl/Cmd+D duplicate, Delete removes, Esc deselects or leaves canvas editing, Ctrl/Cmd+S saves now.

### Phones and tablets

The page is a fixed shape that scales to fit the screen, and the player always fits the whole page on screen. A widescreen page on an upright phone is small (the player suggests turning the phone sideways), so for phone learners choose **Portrait phone 9:16** under Settings → Page shape and use the Phone preview to check. Changing the shape keeps each element's position, so resize or move things afterwards (the **to finish** list flags anything left outside the page). Controls enlarge to touch-friendly sizes on small screens, and drag-and-drop items can be picked up and dropped with a tap or the keyboard (Enter or Space).

The editor itself is designed for a laptop or desktop, and works on a tablet held sideways.

## Using it offline

You have two options, and both work in any modern browser (Chrome, Edge, Firefox, Safari).

**A. Single HTML file (works anywhere, no install).** Download `interactive-designer-offline.html` from the link above (the dashboard also links to it), keep it anywhere on your computer, and double-click it. Nothing else is needed, and it needs no internet at all.

**B. Install the hosted app.** Open the hosted site once while online. It then works offline, even after closing the browser. In Chrome or Edge you can also click the install icon in the address bar to get an app window (Safari: Share → Add to Dock/Home Screen). Updates arrive automatically the next time you open it online.

### Where your work is saved

Activities are saved automatically in **this browser, on this device** (IndexedDB). Things to know:

- Each way of opening the app has its **own** storage. The hosted site, the installed app and the single HTML file do not share activities, and some browsers store file-based data separately per file location. Moving or renaming the HTML file can look like "my activities are gone".
- Browsers can clear site data (clearing history, private windows, low disk space).
- So **back up regularly**: **Back up all** on the dashboard downloads every activity in one file; each activity's download button saves just that one, and a folder's buttons download everything in it. **Open activity file** loads either kind (including from another computer or another way of opening the app).
- To hand an activity to a colleague, send them its activity file.
- If the dashboard stays on "Loading…" and shows "Waiting for another tab", another tab or window of the app (possibly an older one, or one that is itself stuck on "Loading…") is holding the saved activities while the app upgrades its storage. Close **all** other tabs and windows of the site, including any installed app window (or quit and reopen the browser), and the page continues by itself. Nothing is lost.

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
- `src/plugins/<type>` one folder per block type (elements and interactions): definition and scoring (`type.ts`), player renderer (`player.ts`), inspector panel (`Panel.tsx`) and an optional on-canvas editor (`Overlay.tsx`). To add a type, add a folder and register it in `plugins/defs.ts`, `player/registry.ts` and `app/registry.ts`.
- `src/player` framework-free player, built by `vite.player.config.ts` into one `player.js` and one `player.css`. The same bundle runs the in-app preview and the exported package, and it is embedded in the app so nothing is fetched at export time.
- `src/scorm` API discovery, SCORM 1.2 and 2004 adapters, reporter, `suspend_data`, manifest generation.
- `src/app` the authoring app (HashRouter, IndexedDB store, activity files, export with JSZip). `src/app/editor` holds the canvas, inspector, side panels, undo/redo history and the pure editing operations (tested).
- `scripts/make-sw.mjs` generates the service worker that precaches the app. `vite.single.config.ts` builds the single-file version.
- `examples/` a sample activity per interaction type plus a multi-page lesson using all of them (open them with **Open activity file**).

### Package layout

`imsmanifest.xml`, `index.html`, `player.js`, `player.css`, `content.json`, `media/…`. The activity data is also embedded in `index.html`, so it loads even from `file://`. Only images that are actually used are included.

### Interactive video: what to know

- Learners watch the video **from YouTube**, so this is the one interaction that needs an internet connection, on a network that allows YouTube. Your Canvas must also allow embedded YouTube videos: **test a package in your own Canvas before building a whole course around it.** The video must allow embedding too, and a package opened by double-clicking the file (outside an LMS) will not play it.
- Learners are made to watch: YouTube's own controls and keyboard shortcuts are hidden and replaced by Play/Pause, a progress bar that shows every checkpoint (ticked once answered) and Mute. There is no scrubbing, rewinding, speed change or skipping, and if the video position ever jumps ahead of real time it is put back. The video pauses at each checkpoint until it is answered. A determined learner with developer tools can still defeat any browser-based check.
- **Grading** (Grading tab, when the activity is graded): points are earned either by **answering the questions correctly** (graded on the first try), or by **just watching the video**: set the percentage (90 by default) and anyone who watches that much gets full marks. In watch mode, checkpoints still pause the video but their answers are not graded.
- YouTube's own full-screen button is turned off, because questions are drawn over the video.
- Open-ended (typed) answers are not included yet: Canvas has no good way for an instructor to read them.
