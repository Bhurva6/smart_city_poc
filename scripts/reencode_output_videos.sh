#!/usr/bin/env bash
# Re-encode plain + heatmap MP4 videos from output/*/videos/ into output_videos/
# Adds +faststart (moov atom first) so browsers can stream without downloading the full file.
# Only processes *_plain.mp4 and *_heatmap.mp4 — skips _orig.mp4 and anything outside videos/.
#
# Usage: bash scripts/reencode_output_videos.sh

set -uo pipefail

# Always resolve absolute paths — avoids any relative-path ambiguity
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SRC_DIR="$ROOT_DIR/output"
DST_DIR="$ROOT_DIR/output_videos"

# ── Preflight checks ──────────────────────────────────────────────────────────
FFMPEG="$(command -v ffmpeg || true)"
if [[ -z "$FFMPEG" ]]; then
  echo "ERROR: ffmpeg not found. Install with: brew install ffmpeg" >&2
  exit 2
fi

if [[ ! -d "$SRC_DIR" ]]; then
  echo "ERROR: source directory not found: $SRC_DIR" >&2
  exit 1
fi

echo "Source : $SRC_DIR"
echo "Dest   : $DST_DIR"
echo "ffmpeg : $FFMPEG"
echo ""

DONE=0
SKIPPED=0
FAILED=0

# ── Process each folder's plain + heatmap videos ─────────────────────────────
# Explicitly use absolute paths for find and all file operations
while IFS= read -r -d '' src; do
  # src is absolute, e.g. /path/to/output/CBS_.../videos/CBS_..._plain.mp4

  # Skip _orig.mp4 originals
  filename="$(basename "$src")"
  if [[ "$filename" == *_orig.mp4 ]]; then
    continue
  fi

  # Compute dest by replacing SRC_DIR prefix with DST_DIR
  rel="${src#$SRC_DIR/}"           # strip absolute SRC_DIR prefix → CBS_.../videos/...
  dest="$DST_DIR/$rel"
  dest_dir="$(dirname "$dest")"
  tmp="${dest}.tmp.mp4"

  mkdir -p "$dest_dir"

  if [[ -f "$dest" ]]; then
    echo "SKIP  (already done): $rel"
    (( SKIPPED++ )) || true
    continue
  fi

  echo "ENCODE: $rel"
  echo "    ->  $dest"

  if "$FFMPEG" -hide_banner -loglevel error -y \
      -i "$src" \
      -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p \
      -movflags +faststart \
      -an \
      "$tmp"; then
    mv "$tmp" "$dest"
    echo "  OK"
    (( DONE++ )) || true
  else
    echo "  FAILED: $src"
    rm -f "$tmp"
    (( FAILED++ )) || true
  fi

  echo ""

# Use absolute SRC_DIR with find — no relative-path ambiguity, no phantom paths
done < <(find "$SRC_DIR" -type f \
  \( -name '*_plain.mp4' -o -name '*_heatmap.mp4' \) \
  -path '*/videos/*' -print0)

echo "--------------------------------------------"
echo "Encoded: $DONE  |  Skipped: $SKIPPED  |  Failed: $FAILED"
echo "Output: $DST_DIR"
exit 0
