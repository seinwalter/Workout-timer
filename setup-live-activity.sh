#!/bin/bash

# One-command Live Activity setup.
# Automates everything in LIVE_ACTIVITY_SETUP.md.
#
# Usage:  ./setup-live-activity.sh

set -e
cd "$(dirname "$0")"

echo "🥊 Fight Club — Live Activity setup"
echo ""

if [[ "$OSTYPE" != "darwin"* ]]; then
  echo "❌ This script must run on your Mac"
  exit 1
fi

# Xcode must be closed so it doesn't overwrite our project changes
if pgrep -x Xcode >/dev/null; then
  echo "⚠️  Xcode is running. Close Xcode first, then re-run this script."
  echo "   (Xcode would overwrite the project changes when it saves.)"
  exit 1
fi

# Make sure the ios project exists
if [ ! -d "ios/App/App.xcodeproj" ]; then
  echo "📦 iOS project missing — creating it..."
  npm install
  npx cap add ios
fi

npx cap sync ios

# Install the xcodeproj gem if needed (used to edit the Xcode project)
if ! ruby -e "require 'xcodeproj'" 2>/dev/null; then
  echo "💎 Installing the xcodeproj gem (you may be asked for your Mac password)..."
  sudo gem install xcodeproj
fi

ruby scripts/add_live_activity.rb

echo ""
echo "✅ All done! Now run:"
echo "   npx cap open ios"
echo ""
echo "In Xcode: select your iPhone and press Cmd+R."
echo "If Xcode flags signing for FightClubWidget, open the target's"
echo "Signing & Capabilities tab and pick your Team (one click)."
