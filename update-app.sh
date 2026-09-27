#!/bin/bash

# Push web changes to the iOS project.
# The app lives in www/ (index.html, css/, js/, fonts/) — edit those files directly.

set -e
cd "$(dirname "$0")"

echo "🔄 Syncing www/ to the iOS project..."
npx cap sync ios

echo "✅ Done! Build in Xcode with Cmd+R (npx cap open ios to open it)."
