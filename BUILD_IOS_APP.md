# Build Fight Club iOS App

This guide will help you build and install the Fight Club app on your iPhone.

## Prerequisites

You need:
- **Mac computer** (macOS 12 or later)
- **Xcode 14+** (free from Mac App Store)
- **iPhone** (iOS 13 or later)
- **Apple ID** (free, no Developer account needed for personal use)

---

## Step 1: Install Dependencies (on your Mac)

Open Terminal and navigate to this project:

```bash
cd /path/to/Workout-timer
npm install
```

This installs Capacitor and iOS platform.

---

## Step 2: Sync iOS Project

Run this command to create/update the iOS project:

```bash
npx cap sync
```

This creates the `ios/` folder with your Xcode project.

---

## Step 3: Open in Xcode

```bash
npx cap open ios
```

This opens the project in Xcode.

---

## Step 4: Configure Signing (one-time setup)

In Xcode:

1. Click on **"App"** in the left sidebar (blue icon)
2. Select **"App"** under TARGETS
3. Go to **"Signing & Capabilities"** tab
4. Check **"Automatically manage signing"**
5. Select your **Team** (your Apple ID)
   - If you don't see a team, click "Add Account" and sign in with your Apple ID
6. Xcode will create a **Bundle Identifier** like: `com.yourname.fightclub`

**Note:** With a free Apple ID, you can install on your own devices. To publish to App Store, you need a $99/year Developer account.

---

## Step 5: Connect Your iPhone

1. Plug your iPhone into your Mac with USB cable
2. On your iPhone: tap **"Trust This Computer"**
3. In Xcode, at the top, select your iPhone from the device dropdown (next to "App" button)

---

## Step 6: Build & Run

Click the **Play button** (▶️) in Xcode toolbar, or press `Cmd+R`

**First time only:** iPhone will show "Untrusted Developer"
- On iPhone: Settings → General → VPN & Device Management
- Tap your Apple ID → Trust
- Go back and launch the app

---

## Updating the App

After making changes to `fight-club.html`:

```bash
# Copy changes to iOS
npx cap copy

# Open Xcode
npx cap open ios

# Build again (Cmd+R in Xcode)
```

---

## Troubleshooting

### "Could not launch App"
- Make sure iPhone is unlocked
- Try unplugging and replugging the cable
- Restart Xcode

### "Signing failed"
- Make sure you're signed into Xcode with your Apple ID
- Try changing the Bundle Identifier slightly (add a number)

### "Development certificate expired"
- With free Apple ID, apps expire after 7 days
- Just rebuild from Xcode to reinstall

---

## App Features (Native Capabilities)

The Capacitor app includes:
- ✅ Full offline support
- ✅ Custom app icon
- ✅ Splash screen
- ✅ Status bar customization
- ✅ Haptic feedback (can add later)
- ✅ Local storage persistence

---

## Optional: Add to App Store

To publish to App Store:
1. Enroll in Apple Developer Program ($99/year)
2. Create App Store Connect listing
3. Archive the app in Xcode
4. Upload to App Store Connect
5. Submit for review

**For personal use, skip this!** You can build and install on your own devices for free.
