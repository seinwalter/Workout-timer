#!/bin/bash

# Initial setup for the PROTOCOL iOS app.
# Run this ONCE on your Mac (it creates the native Xcode project).

set -e

echo "▲ Setting up PROTOCOL iOS app..."
echo ""

# Must be on a Mac
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo "❌ This script must be run on a Mac (Xcode is Mac-only)."
  exit 1
fi

# Xcode required
if ! command -v xcodebuild &> /dev/null; then
  echo "❌ Xcode is not installed."
  echo "   Install Xcode from the Mac App Store first, then re-run this."
  exit 1
fi

echo "✅ Xcode detected"
echo ""

# Must be run from the app folder (the one with package.json + raw-dawg.html)
if [ ! -f package.json ] || [ ! -f raw-dawg.html ]; then
  echo "❌ Run this from the app folder — the one containing package.json and raw-dawg.html."
  exit 1
fi

echo "📦 Installing Capacitor dependencies..."
npm install

if [ ! -e node_modules/.bin/cap ]; then
  echo "❌ Capacitor CLI missing after npm install."
  echo "   Fix: rm -rf node_modules package-lock.json && npm install   (then re-run this script)"
  exit 1
fi

# Stage the web app for Capacitor
echo "📋 Copying raw-dawg.html → www/index.html..."
mkdir -p www
cp raw-dawg.html www/index.html

# Create the native iOS project if it doesn't exist yet
if [ ! -d "ios" ]; then
  echo "🔧 Adding the iOS platform..."
  npx cap add ios
fi

# Generate the app icon + splash screens from assets/ into the iOS project.
# Scoped package name on purpose — bare "capacitor-assets" resolves to a dead
# registry stub when node_modules is missing ("could not determine executable").
echo "🎨 Generating app icon & splash screens..."
npx --yes @capacitor/assets generate --ios

echo "🔄 Syncing web assets into the iOS project..."
npx cap sync

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Open Xcode:   npx cap open ios"
echo "  2. Connect your iPhone via USB and tap 'Trust This Computer'"
echo "  3. Pick your iPhone in the Xcode toolbar"
echo "  4. Set your signing Team (Signing & Capabilities), then press ▶ (Cmd+R)"
echo ""
echo "📖 Full walkthrough: BUILD_IOS_APP.md"
