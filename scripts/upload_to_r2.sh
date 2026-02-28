#!/usr/bin/env bash
# Upload video assets to Cloudflare R2 for Vercel deployment.
#
# Prerequisites:
#   1. Install rclone:        brew install rclone
#   2. Configure rclone for R2:
#        rclone config
#        → New remote  → Name: r2
#        → Storage: S3 Compatible  → Provider: Cloudflare
#        → Access key / Secret key  (from R2 Dashboard → Manage API Tokens)
#        → Endpoint: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
#        → Leave everything else default
#   3. Create an R2 bucket and enable "Public access" (R2 Dashboard → Bucket → Settings)
#   4. Set the two variables below:

R2_REMOTE="r2"                      # rclone remote name (step 2 above)
R2_BUCKET="smart-city-poc-videos"   # your R2 bucket name (step 3 above)

# ── Preflight ─────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if ! command -v rclone &>/dev/null; then
  echo "ERROR: rclone not found. Install with: brew install rclone" >&2
  exit 2
fi

if [[ -z "$R2_BUCKET" ]]; then
  echo "ERROR: Set R2_BUCKET in this script before running." >&2
  exit 1
fi

DEST="${R2_REMOTE}:${R2_BUCKET}"

echo "Uploading to: $DEST"
echo ""

# ── Upload output_videos/ (faststart-encoded, browser-streamable) ─────────────
echo "--- Uploading output_videos/ ---"
rclone copy "$ROOT_DIR/output_videos" "$DEST/output_videos" \
  --include "*.mp4" \
  --transfers 4 \
  --progress \
  --s3-no-check-bucket

echo ""

# ── Upload inputs/ (raw landing-page preview videos) ─────────────────────────
echo "--- Uploading inputs/ ---"
rclone copy "$ROOT_DIR/inputs" "$DEST/inputs" \
  --include "*.mp4" \
  --transfers 4 \
  --progress \
  --s3-no-check-bucket

echo ""
echo "Upload complete."
echo ""
echo "Next steps:"
echo "  1. In R2 Dashboard, copy the public bucket URL (e.g. https://pub-xxx.r2.dev)"
echo "  2. Open app.js and set:  const VIDEO_CDN_BASE = 'https://pub-xxx.r2.dev';"
echo "  3. Deploy to Vercel:     vercel --prod"
