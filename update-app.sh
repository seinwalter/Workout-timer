#!/bin/bash

# Update the PROTOCOL iOS app after pulling changes.
# Run on your Mac, then rebuild in Xcode (Cmd+R).

set -e

echo "▲ Updating PROTOCOL iOS app..."

echo "📦 Ensuring native plugins are installed (notifications, etc.)..."
npm install

echo "📋 Copying raw-dawg.html → www/index.html..."
cp raw-dawg.html www/index.html

echo "🎨 Regenerating app icon & splash from assets/..."
npx capacitor-assets generate --ios || true

echo "🔄 Syncing changes into the iOS project..."
npx cap sync ios

# The Xcode project keeps the display name it was created with, so sync the
# rename into the existing project (a fresh `cap add ios` gets it automatically).
PLIST="ios/App/App/Info.plist"
if [ -f "$PLIST" ] && command -v /usr/libexec/PlistBuddy &> /dev/null; then
  /usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName PROTOCOL" "$PLIST" 2>/dev/null \
    && echo "🏷  Display name set to PROTOCOL" || true
fi

echo ""
echo "✅ Done. Now rebuild on your iPhone:"
echo "   npx cap open ios   # then press Cmd+R in Xcode"
