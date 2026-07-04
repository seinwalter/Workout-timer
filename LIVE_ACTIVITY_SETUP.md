# Live Activities Setup (Lock Screen + Dynamic Island Timer)

Your workout timer will show as a **live countdown on the lock screen** and in the
**Dynamic Island** (iPhone 14 Pro+). On your iPhone X you'll get the lock screen
version — the countdown runs natively, so it stays accurate even while locked.

**Requires:** iOS 16.2+ on the phone. Xcode 14.1+.

---

## ⚡ Automated setup (recommended)

Close Xcode first, then:

```bash
cd /Users/seinwalter/Downloads/Workout-timer
git pull
./setup-live-activity.sh
npx cap open ios
```

Then in Xcode select your iPhone and press **Cmd+R**. If Xcode shows a signing
error for **FightClubWidget**, click the blue App project icon → FightClubWidget
target → Signing & Capabilities → pick your Team. That's it.

Everything below is the manual equivalent — only needed if the script fails.

---

## Manual steps (fallback)

### Step 0: Pull latest & sync

```bash
cd /Users/seinwalter/Downloads/Workout-timer
git pull
npx cap sync ios
npx cap open ios
```

---

## Step 1: Add the plugin files to the App target

1. In Xcode's left sidebar, right-click the **App** folder (the yellow one inside App project) → **"Add Files to 'App'..."**
2. Navigate to the repo's `native/App/` folder and select **both**:
   - `LiveActivityPlugin.swift`
   - `MyViewController.swift`
3. ✅ Check **"Copy items if needed"**, make sure Target **App** is checked → **Add**

Then add the shared attributes file:

4. Right-click the **App** folder again → **"Add Files to 'App'..."**
5. Select `native/Shared/WorkoutActivityAttributes.swift`
6. ✅ "Copy items if needed", Target **App** checked → **Add**

---

## Step 2: Point the storyboard at MyViewController

1. In the left sidebar open **App → App → Base.lproj → Main.storyboard**
2. Click the **Bridge View Controller** in the storyboard
3. Open the **Identity Inspector** (right panel, 3rd icon — looks like a badge)
4. Under **Custom Class**, change Class from `CAPBridgeViewController` to **`MyViewController`**
   (Module should auto-fill as `App`)

---

## Step 3: Create the Widget Extension

1. **File → New → Target...**
2. Choose **Widget Extension** → Next
3. Product Name: **`FightClubWidget`**
4. ✅ Check **"Include Live Activity"**
5. ❌ Uncheck "Include Configuration App Intent" (if shown)
6. Click **Finish** → when asked to activate the scheme, click **Activate**

---

## Step 4: Replace the generated widget code

1. In the new **FightClubWidget** folder Xcode created, **delete** the generated
   Swift files (`FightClubWidget.swift`, `FightClubWidgetBundle.swift`,
   `FightClubWidgetLiveActivity.swift` — Move to Trash). Keep `Assets.xcassets` and `Info.plist`.
2. Right-click the **FightClubWidget** folder → **"Add Files to 'App'..."**
3. Select both files from the repo's `native/Widget/` folder:
   - `FightClubWidgetBundle.swift`
   - `FightClubLiveActivity.swift`
4. ✅ "Copy items if needed", Target **FightClubWidget** checked (NOT App) → **Add**

---

## Step 5: Share the attributes file with the widget

1. In the left sidebar click **`WorkoutActivityAttributes.swift`** (added in Step 1)
2. Open the **File Inspector** (right panel, 1st icon)
3. Under **Target Membership**, check **BOTH**:
   - ✅ App
   - ✅ FightClubWidget

---

## Step 6: Enable Live Activities in the app's Info.plist

1. Open **App → App → Info.plist**
2. Hover over any row → click **+**
3. Type: **`NSSupportsLiveActivities`** (shows as "Supports Live Activities")
4. Set type **Boolean**, value **YES**

---

## Step 7: Set widget minimum iOS version

1. Click the blue **App** project icon → select the **FightClubWidget** target
2. **General** tab → **Minimum Deployments** → set to **16.2**
3. While there, check **Signing & Capabilities** for FightClubWidget:
   ✅ "Automatically manage signing" + your Team selected

---

## Step 8: Build & run

1. Select the **App** scheme (top toolbar, next to device picker — NOT FightClubWidget)
2. Select your iPhone
3. **Cmd+R**

---

## Test it

1. Start a workout timer in the app
2. Lock your phone
3. The countdown appears on the lock screen 🎉
4. On iPhone 14 Pro+ it also lives in the Dynamic Island

---

## Troubleshooting

**"Cannot find 'WorkoutActivityAttributes' in scope"** (in widget files)
→ Step 5 wasn't done — the attributes file must be a member of both targets.

**"Cannot find 'LiveActivityPlugin' in scope"** (in MyViewController)
→ Both files from Step 1 must be in the App target.

**Live Activity never appears**
→ Check Step 6 (NSSupportsLiveActivities) and that iPhone Settings →
Fight Club → **Live Activities** is enabled. Requires iOS 16.2+.

**Widget scheme builds instead of the app**
→ Step 8: switch the scheme back to **App**.
