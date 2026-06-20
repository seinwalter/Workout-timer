#!/bin/bash

# Update the RAW DAWG iOS app after editing raw-dawg.html.
# Run on your Mac, then rebuild in Xcode (Cmd+R).

set -e

echo "🔥 Updating RAW DAWG iOS app..."

echo "📦 Ensuring native plugins are installed (notifications, etc.)..."
npm install

echo "📋 Copying raw-dawg.html → www/index.html..."
cp raw-dawg.html www/index.html

echo "🔄 Syncing changes into the iOS project..."
npx cap sync ios

echo ""
echo "✅ Done. Now rebuild on your iPhone:"
echo "   npx cap open ios   # then press Cmd+R in Xcode"
