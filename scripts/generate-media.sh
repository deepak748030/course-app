#!/usr/bin/env bash
# Provenance + regeneration for DERIVED media in assets/.
# Photography in assets/images/*.jpg is AI-generated for this prototype (see README "Assets & placeholders").
# This script only builds what is derived from it, so every derivative is reproducible:
#
#   assets/videos/*.mp4              short, silent demo clips (slow push-in over a still) used as
#                                    placeholder trailer/lesson footage until real course video exists.
#   assets/images/placeholder-panel-4x3.jpg  the brand fallback panel for a photograph that does
#                                    not exist yet. It is a designed panel (ivory ground, ink bowl
#                                    and play mark, yellow arc) committed to the repo; regenerate it
#                                    from the same brief when the brand mark changes.
#
# Requires: ffmpeg (or `pip install imageio-ffmpeg`) and ImageMagick `convert`.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMG="$ROOT/assets/images"
VID="$ROOT/assets/videos"
mkdir -p "$VID"

FFMPEG="${FFMPEG:-$(python3 -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())')}"

clip() { # clip <still> <out> [seconds]
  local still="$1" out="$2" secs="${3:-20}"
  "$FFMPEG" -y -loglevel error -loop 1 -i "$still" -t "$secs" -r 30 \
    -vf "scale=1600:-2,zoompan=z='min(zoom+0.0004,1.15)':d=$((secs * 30)):s=960x540:fps=30,fade=t=in:st=0:d=0.8,fade=t=out:st=$((secs - 1)):d=1,format=yuv420p" \
    -c:v libx264 -preset veryfast -crf 30 -movflags +faststart -an "$out"
  echo "wrote $out"
}

clip "$IMG/course-milk-foundations.jpg" "$VID/demo-clip-milk.mp4"
clip "$IMG/course-paneer-craft.jpg"     "$VID/demo-clip-paneer.mp4"
clip "$IMG/course-ghee-butter.jpg"      "$VID/demo-clip-ghee.mp4"
clip "$IMG/course-curd-ferments.jpg"    "$VID/demo-clip-curd-ferments.mp4"

# The designed fallback panel for a photograph that does not exist yet: ivory ground, the YDU
# Academy mark in ink and the brand arc, regenerated from the same brief as the brand mark.
MARK="${MARK:-$ROOT/../mark.png}"
if [ -f "$MARK" ]; then
  convert -size 1200x896 xc:'#FBF5E4' \
    \( "$MARK" -resize 380x380 \) -gravity center -composite \
    -fill none -stroke '#FFC629' -strokewidth 26 \
    -draw "stroke-linecap round path 'M 430,660 Q 600,742 770,660'" \
    "$IMG/placeholder-panel-4x3.jpg"
  echo "wrote $IMG/placeholder-panel-4x3.jpg"
fi
