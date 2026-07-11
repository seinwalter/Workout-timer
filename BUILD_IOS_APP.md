# Build the PROTOCOL iOS App

Turn the PROTOCOL discipline tracker into a real native app on your iPhone — same
technique as the Fight Club app (Capacitor wrapping the web app). No App Store
and no paid Developer account needed for personal use.

## Prerequisites

- **Mac** (macOS 12 or later)
- **Xcode 14+** (free from the Mac App Store)
- **iPhone** (iOS 13 or later)
- **Apple ID** (free — a paid Developer account is only needed to ship to the App Store)

---

## Quick start

On your Mac, in Terminal:

```bash
cd /path/to/Workout-timer
git pull origin claude/confident-lamport-gskbsx   # get this branch
chmod +x setup-ios.sh
./setup-ios.sh
```

`setup-ios.sh` installs dependencies, copies `raw-dawg.html` into `www/`,
creates the native iOS project, and syncs it. Then:

```bash
npx cap open ios
```

…and jump to **Step 4 (Signing)** below.

---

## Manual steps (what the script does)

### 1. Install dependencies

```bash
npm install
```

Installs Capacitor core, the iOS platform, and the Haptics / Local Notifications / Status Bar / App plugins.

### 2. Stage the web app + create the iOS project

```bash
mkdir -p www
cp raw-dawg.html www/index.html
npx cap add ios
npx --yes @capacitor/assets generate --ios   # app icon + splash from assets/
npx cap sync
```

This creates the `ios/` folder containing the Xcode project, and bakes the
PROTOCOL app icon + launch screen into it (generated from `assets/icon.png`
and `assets/splash*.png`).

### 3. Open in Xcode

```bash
npx cap open ios
```

### 4. Configure signing (one-time)

In Xcode:

1. Select **App** in the left sidebar (blue icon)
2. Select **App** under **TARGETS**
3. Open the **Signing & Capabilities** tab
4. Check **Automatically manage signing**
5. Choose your **Team** (your Apple ID — click *Add Account* if it isn't listed)

The Bundle Identifier defaults to `com.seinwalter.rawdawg` (set in `capacitor.config.ts`). If signing complains it's taken, change it slightly (e.g. `com.seinwalter.rawdawg2`).

> With a free Apple ID you can install on your own devices. Apps re-signed this way expire after 7 days — just rebuild from Xcode to reinstall.

### 5. Connect your iPhone

1. Plug the iPhone into the Mac via USB
2. On the iPhone, tap **Trust This Computer**
3. In Xcode's toolbar, pick your iPhone from the device dropdown

### 6. Build & run

Press the **▶ Play** button (or `Cmd+R`).

First launch shows **Untrusted Developer**:
- iPhone → **Settings → General → VPN & Device Management** → tap your Apple ID → **Trust**
- Re-launch PROTOCOL from the home screen.

---

## Granting permissions (first run)

- A prompt appears: **"PROTOCOL" Would Like to Send You Notifications** → tap **Allow** (for milestone + daily-reminder alerts).
- Haptics work automatically (make sure **Settings → Sounds & Haptics → System Haptics** is on).

---

## Updating the app after changes

Whenever you edit `raw-dawg.html`:

```bash
./update-app.sh        # copies raw-dawg.html → www/index.html and runs cap sync
npx cap open ios       # then press Cmd+R in Xcode
```

---

## Native features in this build

- ✅ **Native iOS notifications** — milestone hits and daily reminders fire as real iOS notifications (Capacitor Local Notifications), with an automatic web fallback.
- ✅ **Haptic feedback** — every tap is a light impact; relapse/check-in is medium; a milestone is a heavy buzz.
- ✅ **Custom minimal app icon + launch screen** — generated from `assets/icon.png` & `assets/splash*.png` by `@capacitor/assets` (regenerate any time with `npm run assets:generate`).
- ✅ **Dark status bar + splash** themed to PROTOCOL (`#0d1117` / `#58a6ff`).
- ✅ **Full offline support** — the entire app is a single self-contained HTML file.
- ✅ **On-device storage** — all streaks persist in local storage.

The same `raw-dawg.html` still runs as a web PWA at
`https://seinwalter.github.io/Workout-timer/raw-dawg.html` — the native bridge
is inert (falls back to web APIs) when there's no Capacitor.

---

## Troubleshooting

- **"Could not launch app"** — unlock the iPhone, replug the cable, restart Xcode.
- **"Signing failed"** — make sure you're signed into Xcode with your Apple ID; tweak the Bundle Identifier.
- **No notifications** — iPhone → Settings → Notifications → PROTOCOL → Allow Notifications.
- **No haptics** — iPhone → Settings → Sounds & Haptics → System Haptics → on.
- **Certificate expired (free account)** — just rebuild from Xcode to reinstall.

---

## Optional: ship to the App Store

1. Enroll in the Apple Developer Program ($99/yr)
2. Create an App Store Connect listing
3. In Xcode: **Product → Archive**, then upload via the Organizer
4. Submit for review

For personal use you can skip all of that and run it on your own iPhone for free.
