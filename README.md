# Interactive Designer

Author interactive learning activities in the browser and export them as **SCORM packages** (SCORM 2004 4th Edition or 1.2) to upload to Canvas as graded assignments. Everything is static: GitHub Pages hosts the app, Firebase (free Spark plan) stores your work, and SCORM export happens in your browser.

Live app: https://galvinradleyngo.github.io/interactivedesigner/

## What works today

- **Multiple choice** (Phase 1): single or multiple answers, per-option feedback, shuffle, retry.
- Dashboard (create, open, rename, duplicate, delete), editor with live preview that uses the real player, autosave, per-activity design (colors, font, corner radius, background image), image upload.
- SCORM export for 2004 4th Edition (default) and 1.2: score (raw/min/max, plus scaled for 2004), completion, pass/fail against your passing score, resume via `suspend_data`. Exported packages make no network requests.

Planned next: True/False, Fill in the blanks, Hotspots, Drag-and-drop, Flash cards, Image comparison, Timeline, Interactive Video (YouTube), Branching, Game map, Crossword, Word search, Memory game, with a drag-and-resize stage editor for designers.

## 1. Create the Firebase project (free Spark plan)

1. Go to <https://console.firebase.google.com> → **Add project**. Analytics isn't needed.
2. **Build → Authentication → Get started → Sign-in method → Google → Enable**. Pick a support email and save.
3. **Authentication → Settings → Authorized domains → Add domain** → `galvinradleyngo.github.io`. (`localhost` is already there for local development.) **Without this, Google sign-in fails on the live site.**
4. **Build → Firestore Database → Create database.** Choose a location, then **Production mode**. Rules are deployed in step 4 below.
5. **Project settings (gear) → General → Your apps → Web (`</>`)** → register an app (skip Firebase Hosting). Copy the `firebaseConfig` values; you need them next.
6. **Storage is optional and not needed.** It requires the paid Blaze plan, so by default images are resized in the browser and stored in Firestore (one document per image, each under 1 MB). Leave `VITE_FIREBASE_USE_STORAGE=false`.

## 2. Add the GitHub secrets

Repository → **Settings → Secrets and variables → Actions → New repository secret**. Add each one (values from the `firebaseConfig` in step 5):

| Secret name                         | `firebaseConfig` key                     |
| ----------------------------------- | ---------------------------------------- |
| `VITE_FIREBASE_API_KEY`             | `apiKey`                                 |
| `VITE_FIREBASE_AUTH_DOMAIN`         | `authDomain`                             |
| `VITE_FIREBASE_PROJECT_ID`          | `projectId`                              |
| `VITE_FIREBASE_STORAGE_BUCKET`      | `storageBucket`                          |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId`                      |
| `VITE_FIREBASE_APP_ID`              | `appId`                                  |
| `VITE_FIREBASE_USE_STORAGE`         | `false` (leave `false` on the free plan) |

These web config values are not secret in the security sense (they ship in the built app). Access is enforced by the security rules, so deploy those (step 4).

## 3. Enable GitHub Pages

Repository → **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Merge this branch into `main` (open a pull request on GitHub and merge it). The workflow in `.github/workflows/deploy.yml` lints, tests, builds and deploys to https://galvinradleyngo.github.io/interactivedesigner/. You can also run it manually from the **Actions** tab (**Run workflow**).

## 4. Deploy the security rules

```bash
npm install -g firebase-tools
firebase login
firebase use --add            # choose your project
firebase deploy --only firestore:rules,firestore:indexes
```

(`firebase deploy --only storage` is only needed if you enable Storage later.)

You can also paste `firestore.rules` into **Firestore → Rules** in the console and click **Publish**.

The rules mean: each signed-in user can read and write only `users/{their uid}/…`. They also give `salt@ateneo.edu` (verified Google account) **read-only** access to everyone's activities. Remove the `isAdmin()` rule in `firestore.rules` if you don't want that (the email is visible in the repository).

## 5. Run locally

```bash
npm install
cp .env.example .env.local     # fill in the VITE_FIREBASE_* values
npm run dev                    # http://localhost:5173/interactivedesigner/
```

If `.env.local` has no Firebase values, the app runs in **local mode**: activities are saved in your browser only, with no sign-in. That's handy for trying it out.

Other scripts: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run format`.

## 6. Test the package on SCORM Cloud, then Canvas

1. In the editor, set the **passing score** and **SCORM version**, then click **Export SCORM**. A `.zip` named after the activity title downloads.
2. **SCORM Cloud test:** create a free account at <https://cloud.scorm.com> → **Add Content → Import a course** → choose the zip → **Launch**. Complete the activity and check that the registration shows the score, completion and passed/failed.
3. **Canvas:** in your course, use your institution's SCORM tool (the exact name depends on how it's set up, for example the **SCORM** app) → **Upload** → choose the zip → **Import as Graded Assignment** (set the points). Students' scores come from the SCO's reported score.

If Canvas doesn't offer SCORM at your institution, ask your Canvas administrator which SCORM tool is installed.

## Optional: Storage and CORS

Only if you turn Storage on (Blaze plan): set `VITE_FIREBASE_USE_STORAGE=true`, deploy `storage.rules`, and apply CORS so export can fetch images into the zip:

```bash
gcloud storage buckets update gs://YOUR_BUCKET --cors-file=cors.json
```

`cors.json` allows GET from the GitHub Pages origin and localhost. Images added by URL need CORS headers from their host to be included in the export.

## How it's built

- `src/schema` versioned content schema (`schemaVersion`) with `migrate()`, plus the HTML sanitizer.
- `src/plugins/<type>` one folder per activity type: type definition and scoring (`type.ts`, `score.ts`), React editor (`Editor.tsx`), player renderer (`player.ts`).
- `src/player` framework-free player, built by `vite.player.config.ts` into one `player.js` and one `player.css`. The same bundle runs the in-app preview and the exported package.
- `src/scorm` API discovery, SCORM 1.2 and 2004 adapters, reporter, `suspend_data`, manifest generation.
- `src/app` the authoring app (HashRouter, Firebase, export with JSZip).
- `examples/` a sample activity JSON per type.

### Package layout

`imsmanifest.xml`, `index.html`, `player.js`, `player.css`, `content.json`, `media/…`. The activity data is also embedded in `index.html`, so it loads even from `file://`.
