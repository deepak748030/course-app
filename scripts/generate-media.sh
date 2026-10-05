#!/usr/bin/env bash
# Provenance + regeneration for DERIVED media in assets/.
# Photography in assets/images/*.jpg is AI-generated for this prototype (see README "Assets & placeholders").
# This script only builds what is derived from it, so every derivative is reproducible:
#
#   assets/videos/*.mp4              short, silent demo clips (slow push-in over a still) used as
#                                    placeholder trailer/lesson footage until real course video exists.
#   assets/images/placeholder-*.jpg  warm brand panels for assets that have not been generated yet.
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

clip "$IMG/course-restaurant-gravies.jpg" "$VID/demo-clip-gravies.mp4"
clip "$IMG/course-everyday-indian.jpg"    "$VID/demo-clip-home-cooking.mp4"
clip "$IMG/course-baking-basics.jpg"      "$VID/demo-clip-baking.mp4"
# Knife-skills cover is not generated yet, so the foundations clip pushes in over the countertop lesson still.
clip "$IMG/onboarding-guided-learning.jpg" "$VID/demo-clip-foundations.mp4"

panel() { # panel <out> <w> <h> <accent>
  local out="$1" w="$2" h="$3" accent="$4"
  convert -size "${w}x${h}" gradient:'#F8F2E9-#EBE0D2' \
    -fill "$accent" -draw "circle $((w / 2)),$((h / 2)) $((w / 2)),$((h / 2 - h / 9))" \
    -fill '#F8F2E9' -draw "polygon $((w / 2 - w / 26)),$((h / 2 - h / 30)) $((w / 2 - w / 26)),$((h / 2 + h / 30)) $((w / 2 + w / 40)),$((h / 2))" \
    "$out"
  echo "wrote $out"
}

panel "$IMG/placeholder-panel-4x3.jpg" 900 675 '#9F3F2F'
panel "$IMG/placeholder-portrait.jpg" 700 700 '#65755A'

# Fill any photograph that has not been generated yet with its documented placeholder.
[ -f "$IMG/course-eggless-desserts.jpg" ] || cp "$IMG/placeholder-panel-4x3.jpg" "$IMG/course-eggless-desserts.jpg"
[ -f "$IMG/course-knife-skills.jpg" ]     || cp "$IMG/placeholder-panel-4x3.jpg" "$IMG/course-knife-skills.jpg"
for id in meera arjun rhea vikram nandini; do
  [ -f "$IMG/instructor-$id.jpg" ] || cp "$IMG/placeholder-portrait.jpg" "$IMG/instructor-$id.jpg"
done
