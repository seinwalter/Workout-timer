#!/bin/bash

# Update Fight Club iOS App
# Run this script after making changes to fight-club.html

echo "📱 Updating Fight Club iOS App..."

# Copy updated HTML to www directory
echo "📋 Copying fight-club.html to www/index.html..."
cp fight-club.html www/index.html

# Sync changes to iOS
echo "🔄 Syncing to iOS project..."
npx cap sync

echo "✅ Done! Now open Xcode and rebuild:"
echo "   npx cap open ios"
echo ""
echo "Then press Cmd+R in Xcode to build and run on your iPhone."
