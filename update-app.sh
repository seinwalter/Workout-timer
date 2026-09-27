#!/bin/bash

# One command to update the iPhone app — web files AND native Swift.
#
#   ./update-app.sh
#
# Then press Cmd+R in Xcode (it opens automatically).
# After this has run once, web-only changes (anything in www/) just need
# Cmd+R — Xcode copies www/ on every build.

set -e
cd "$(dirname "$0")"

if pgrep -x Xcode >/dev/null; then
  echo "⚠️  Quit Xcode first (Cmd+Q), then run ./update-app.sh again."
  echo "   (Xcode overwrites project changes if it's open.)"
  exit 1
fi

echo "📦 Installing packages..."
npm install --no-audit --no-fund

echo "🧪 Running tests..."
npm test --silent || { echo "❌ Tests failed — not updating."; exit 1; }

# Syncs www/, copies native Swift, sets up Live Activity + HealthKit + the web-sync build phase
./setup-live-activity.sh

echo ""
echo "🚀 Opening Xcode — press Cmd+R to install on your iPhone."
open ios/App/App.xcworkspace
