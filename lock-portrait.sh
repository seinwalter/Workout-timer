#!/bin/bash

# Locks the iOS app to portrait orientation (no more ugly rotation).
# Run once on your Mac: ./lock-portrait.sh
# Re-run if you ever delete and re-create the ios/ folder.

set -e
cd "$(dirname "$0")"

PLIST="ios/App/App/Info.plist"
PB="/usr/libexec/PlistBuddy"

if [ ! -f "$PLIST" ]; then
  echo "❌ $PLIST not found. Run 'npx cap add ios' first."
  exit 1
fi

echo "🔒 Locking orientation to portrait..."

# iPhone
$PB -c "Delete :UISupportedInterfaceOrientations" "$PLIST" 2>/dev/null || true
$PB -c "Add :UISupportedInterfaceOrientations array" "$PLIST"
$PB -c "Add :UISupportedInterfaceOrientations:0 string UIInterfaceOrientationPortrait" "$PLIST"

# iPad (kept portrait both ways so it still passes App Store checks if ever submitted)
$PB -c "Delete :UISupportedInterfaceOrientations~ipad" "$PLIST" 2>/dev/null || true
$PB -c "Add :UISupportedInterfaceOrientations~ipad array" "$PLIST"
$PB -c "Add :UISupportedInterfaceOrientations~ipad:0 string UIInterfaceOrientationPortrait" "$PLIST"
$PB -c "Add :UISupportedInterfaceOrientations~ipad:1 string UIInterfaceOrientationPortraitUpsideDown" "$PLIST"

echo "✅ Portrait locked. Rebuild in Xcode (Cmd+R) to apply."
