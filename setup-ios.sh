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

echo "📦 Installing Capacitor dependencies..."
npm install

# Stage the web app for Capacitor
echo "📋 Copying raw-dawg.html → www/index.html..."
mkdir -p www
cp raw-dawg.html www/index.html

# Create the native iOS project if it doesn't exist yet
if [ ! -d "ios" ]; then
  echo "🔧 Adding the iOS platform..."
  npx cap add ios
fi

# Generate the app icon + splash screens from assets/ into the iOS project
echo "🎨 Generating app icon & splash screens..."
npx capacitor-assets generate --ios

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
