# PROJECT BRIEF — Workout-Timer repo (Fight Club + PROTOCOL)

> Context pack for deep research on improving these apps. Everything below was
> verified against the repo on 2026-09-27.

## Where the code lives

**Repository:** `https://github.com/seinwalter/Workout-timer`
**Local clone (user's Mac):** `~/Downloads/Workout-timer/rawdawg-app`
**Live branch (ALL current work):** `claude/confident-lamport-gskbsx` — tip `5d7d254`
**Open PR (draft, unmerged):** https://github.com/seinwalter/Workout-timer/pull/11
**⚠️ `main` is stale:** it ends at PR #10 (`14555f7`) — old RAW DAWG branding, no
trading/fasting trackers. Any research or edits must start from the branch above,
not `main`. GitHub Pages also serves from `main`, so the hosted pages are the old
versions until PR #11 merges.

The repo contains **two independent single-file apps**, each duplicated into
three identical copies that must be kept in sync (no build step — copies are
synced with `cp`):

| App | Canonical file | Identical copies | Lines |
|---|---|---|---|
| **Fight Club** (workout interval timer) | `fight-club.html` | `index.html`, `public/index.html` | 2,154 |
| **PROTOCOL** (habit/discipline tracker, ex-RAW DAWG) | `public/raw-dawg.html` | `raw-dawg.html`, `www/index.html` | 1,854 |

Sync rule after editing: copy the canonical file over its copies, byte-identical
(`diff -q` to verify). `www/index.html` is what the native iOS app ships
(Capacitor `webDir: www`).

## App 1 — PROTOCOL (`public/raw-dawg.html`)

Single-file vanilla JS + CSS, no dependencies. Runs three ways: GitHub Pages
(`/raw-dawg.html`), iOS home-screen PWA, and a **native iOS app via Capacitor**
(this is what the user runs daily).

- **Storage:** `localStorage` key `rawdawg.v1` (legacy name kept deliberately —
  renaming it orphans existing installs' data). JSON export/import in settings.
- **Four tracker types**, dispatched on `h.type` throughout:
  - `quit` — time-since-X live clock, milestones (`QUIT_MS`), relapse resets,
    "Hold the line" craving intervention (4-7-8 breathing full-screen).
  - `build` — daily check-in streak (`BUILD_DAYS` milestones).
  - `disc` — daily win/loss rules log (built for trading discipline); streak =
    consecutive wins, unlogged days (weekends) never break it; loss notes log.
  - `fast` — timed fasting sessions: goal picker (16/18/24/36/48/72h),
    `FAST_STAGES` (hour-by-hour physiology explainer: fat-burning → ketosis →
    autophagy → immune reset), adjustable start time (backdating), session log.
- **Notifications:** two paths, deliberately non-overlapping.
  - Web/in-app: `notify()` uses the web Notification API, **no-ops on native**.
  - Native (the important one): `syncScheduledReminders()` pre-schedules
    everything with `@capacitor/local-notifications` so alerts fire with the app
    closed. Pattern: clear-all-then-reschedule, fully derived from state, re-run
    on every mutation + app foreground. ID bands: `100000` daily reminders
    (weekday-only = 5 weekly alarms, Capacitor weekday 2–6), `200000` quit
    milestones, `300000` fasting stage alerts. Budget `MAX_SCHEDULED = 60`
    (iOS caps ~64 pending).
- **Key functions to read first:** `syncScheduledReminders`, `tick` (1s loop:
  clocks, stage crossings, in-app reminders), `card`/`fastCard`/`discCard`,
  `saveHabit`, `selectPreset` (has a subtle preset-value-leak guard), `PRESETS`,
  `FAST_STAGES`/`FAST_GOALS`.
- **Testing pattern used so far:** node harness that regex-extracts functions
  from the HTML and runs them against mocked DOM/plugins (see PR #11 commit
  messages for the 42 assertions' scope). No test files are committed — a
  candidate improvement is moving these into `tests/` in the repo.

## App 2 — Fight Club (`fight-club.html`)

Older single-file workout interval timer (rounds / exercises / rest periods).
Web-only APIs, no Capacitor bridge. **This is where the two open user-reported
bugs live** (below).

Code landmarks (line numbers valid at `5d7d254`; file unchanged since July):
- `1323` — notifications toggle in settings UI (`toggleNotifications()` at `2067`)
- `1461–1481` — WebAudio beep engine (`audioContext`, `playSound`)
- `1484` — `showNotification(title, message)`: gated on
  `Notification.permission === 'granted'`, calls `new Notification(...)`
- `1509` — `navigator.vibrate([100, 50, 100])`
- `1514` — `requestNotificationPermission()`
- `1756–1779` — the timer's phase-transition block (rest start, next exercise,
  round complete, workout complete) — every cue fires from here
- `1992` — workout-complete notification
- `2146–2149` — `audioContext.resume()` on visibility change

## Native iOS build pipeline (PROTOCOL only)

- `capacitor.config.json` — appId `com.seinwalter.rawdawg` (NEVER change: same
  bundle = in-place update, data preserved), appName `PROTOCOL`, webDir `www`.
  It's JSON on purpose: the `.ts` config crashed Capacitor's TypeScript loader
  ("Cannot read properties of undefined (reading 'CommonJS')") when a parent
  folder's broken `typescript` leaked into Node module resolution.
- `package.json` — Capacitor 6 + plugins (local-notifications, haptics,
  status-bar, app); `@capacitor/assets` for icon generation.
- `assets/gen-icon.js` — pure-Node PNG/SVG icon generator (three ascending blue
  bars on `#0d1117`); writes `assets/icon.png` + splashes.
- `setup-ios.sh` (first-time) / `update-app.sh` (every update) — both guard
  against wrong-directory runs and missing CLI, use scoped
  `npx --yes @capacitor/assets`, and sync `CFBundleDisplayName` via PlistBuddy.
- Update loop on the Mac:
  `git pull origin claude/confident-lamport-gskbsx && ./update-app.sh && npx cap open ios` → Cmd+R.
  Pure HTML changes need only this; Xcode signing changes only when native bits
  change. The `ios/` directory is generated, not committed.

## Known open issues (reported by the user, NOT yet fixed)

These are the immediate research targets:

1. **Fight Club: cues don't fire mid-workout.** "One rest notification during
   the entire workout." Root-cause hypotheses to verify, in likelihood order:
   iOS suspends JS timers the moment the screen locks or Safari backgrounds
   (worst during a workout — phone goes down between sets, `setInterval` stops,
   the whole timer stalls, not just the alert); `new Notification()` is
   unsupported/unreliable in iOS Safari and home-screen PWAs; no wake lock is
   held. Fix directions: `navigator.wakeLock` (screen stays on = timers keep
   running = sound/vibration suffice), timestamp-based timing (compute elapsed
   from `Date.now()` deltas on every tick instead of counting intervals, so a
   suspended timer catches up correctly on resume), louder multi-cue
   transitions (sound + vibration + visual flash rather than notifications),
   and optionally wrapping Fight Club in the same Capacitor shell to reuse
   PROTOCOL's pre-scheduled `LocalNotifications` pattern (phase times are fully
   predictable at workout start, so every rest/round alert can be scheduled
   up-front the way fasting stage alerts are).
2. **Fight Club: the clock scrolls off-screen on the user's iPhone.** Wanted:
   the running timer pinned/always visible ("lock on the clock") — sticky
   positioning or a dedicated fit-to-viewport workout mode (`100dvh`, no page
   scroll while running), safe-area aware.

## Improvement backlog (candidates beyond the bugs)

- Port Fight Club to the PROTOCOL visual system (it still has the old styling)
  or merge both apps into one shell with tabs.
- Commit the node test harness as real files; add CI.
- PROTOCOL: edit/delete individual fast-log and session-log entries; history
  charts; iOS widgets / Live Activities (fasting progress on the lock screen —
  needs native work beyond the WebView); Health app export.
- De-duplicate the 3-copy file layout with a tiny build/copy script or symlinked
  Pages deploy, so edits can't silently diverge.

## House rules discovered the hard way (keep these)

- Never rename the bundle id or the `rawdawg.v1` storage key.
- All three copies of each app must stay byte-identical.
- Zsh on macOS treats pasted `# comments` as arguments — never put inline
  comments in command blocks given to the user.
- iOS keeps ~64 pending local notifications; schedule reminders first, then the
  soonest one-shots, capped at 60.
