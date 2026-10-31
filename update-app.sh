#!/bin/bash

# Update the PROTOCOL iOS app after pulling changes.
# Run on your Mac from the app folder, then rebuild in Xcode (Cmd+R).

set -e

# Must be run from the app folder (the one with package.json + raw-dawg.html)
if [ ! -f package.json ] || [ ! -f raw-dawg.html ]; then
  echo "❌ Run this from the app folder — the one containing package.json and raw-dawg.html."
  echo "   e.g.:  cd ~/rawdawg-app && ./update-app.sh"
  exit 1
fi

echo "▲ Updating PROTOCOL iOS app..."

echo "📦 Ensuring native plugins are installed (notifications, etc.)..."
npm install

# npm install must have produced the Capacitor CLI, or every npx call below
# would fall back to the registry and die with "could not determine executable".
if [ ! -e node_modules/.bin/cap ]; then
  echo "❌ Capacitor CLI missing after npm install."
  echo "   Fix: rm -rf node_modules package-lock.json && npm install   (then re-run this script)"
  exit 1
fi

echo "📋 Copying raw-dawg.html → www/index.html..."
mkdir -p www
cp raw-dawg.html www/index.html

echo "🎨 Regenerating app icon & splash from assets/..."
npx --yes @capacitor/assets generate --ios || echo "   (icon generation skipped — not fatal)"

echo "🔄 Syncing changes into the iOS project..."
npx cap sync ios

# The Xcode project keeps the display name it was created with, so sync the
# rename into the existing project (a fresh `cap add ios` gets it automatically).
PLIST="ios/App/App/Info.plist"
if [ -f "$PLIST" ] && command -v /usr/libexec/PlistBuddy &> /dev/null; then
  /usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName PROTOCOL" "$PLIST" 2>/dev/null \
    && echo "🏷  Display name set to PROTOCOL" || true
  # Show the app's Documents folder (backups) in Files › On My iPhone › PROTOCOL.
  for KEY in UIFileSharingEnabled LSSupportsOpeningDocumentsInPlace; do
    /usr/libexec/PlistBuddy -c "Set :$KEY true" "$PLIST" 2>/dev/null \
      || /usr/libexec/PlistBuddy -c "Add :$KEY bool true" "$PLIST" 2>/dev/null || true
  done
  echo "📁 Backups folder enabled in the Files app"
fi

# Your data lives with the bundle id. If the Xcode project's id has drifted from
# capacitor.config.json (e.g. it was changed to get past a signing error), Xcode
# installs a SEPARATE app with empty storage and your records look "lost".
PBX="ios/App/App.xcodeproj/project.pbxproj"
WANT_ID=$(grep -o '"appId": *"[^"]*"' capacitor.config.json | sed 's/.*: *"//; s/"$//')
if [ -f "$PBX" ] && [ -n "$WANT_ID" ]; then
  HAVE_IDS=$(grep -o 'PRODUCT_BUNDLE_IDENTIFIER = [^;]*' "$PBX" | sed 's/.*= //' | tr -d '"' | sort -u | tr '\n' ' ' | sed 's/ $//')
  if [ "$HAVE_IDS" = "$WANT_ID" ]; then
    echo "🔒 Bundle id is $WANT_ID — your existing data will carry over"
  else
    echo ""
    echo "⚠️  BUNDLE ID MISMATCH — Xcode project uses: ${HAVE_IDS:-unknown}"
    echo "    capacitor.config.json expects:     $WANT_ID"
    echo "    Installing this build creates a separate app with EMPTY data."
    echo "    Fix: Xcode › App target › Signing & Capabilities › Bundle Identifier = $WANT_ID"
    echo ""
  fi
fi

echo ""
echo "⚠️  Never delete PROTOCOL from the phone to fix a signing/expired-app error —"
echo "    deleting it erases its data AND its backups folder. Just rebuild over it."
echo ""
echo "✅ Done. Now rebuild on your iPhone:"
echo "   npx cap open ios   # then press Cmd+R in Xcode"
