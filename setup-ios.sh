#!/bin/bash

# Initial setup for Fight Club iOS App
# Run this ONCE on your Mac

set -e

echo "🥊 Setting up Fight Club iOS App..."
echo ""

# Check if running on Mac
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo "❌ This script must be run on a Mac"
  exit 1
fi

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
  echo "❌ Xcode is not installed"
  echo "   Please install Xcode from the Mac App Store first"
  exit 1
fi

echo "✅ Xcode detected"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Initialize Capacitor (if not already done)
if [ ! -d "ios" ]; then
  echo "🔧 Initializing iOS project..."
  npx cap add ios
fi

# Sync files
echo "🔄 Syncing files to iOS..."
npx cap sync

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Open Xcode:     npx cap open ios"
echo "2. Connect iPhone via USB"
echo "3. Select your iPhone in Xcode toolbar"
echo "4. Press ▶️ (or Cmd+R) to build and run"
echo ""
echo "📖 See BUILD_IOS_APP.md for detailed instructions"
