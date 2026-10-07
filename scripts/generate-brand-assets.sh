#!/usr/bin/env bash
# Generates the app icon set from the YDU Academy brand mark: a milk can with a play triangle on
# its face and a drop beneath it. Geometry matches the in-app vector mark in src/components/marks.tsx.
#
# The mark is drawn once at 512px and scaled, so every icon size comes from the same source of
# truth and nothing has to be re-exported by hand when the mark changes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMG="$ROOT/assets/images"
MASTER="$(mktemp -d)/mark.png"

PAPER='#FFFFFF'
INK='#14532D'

# 1. Master mark, transparent background, on a 1024 grid (the same 48-unit geometry as the SVG).
convert -size 1024x1024 xc:none \
  -fill "$INK" \
  -draw "rectangle 330,214 694,286" \
  -draw "rectangle 380,286 644,352" \
  -draw "path 'M 380,352 L 644,352 L 724,440 L 724,700 Q 724,752 672,752 L 352,752 Q 300,752 300,700 L 300,440 Z'" \
  -fill "$PAPER" \
  -draw "polygon 452,480 452,624 580,552" \
  -fill "$INK" \
  -draw "path 'M 512,766 C 476,820 450,850 450,876 C 450,912 478,936 512,936 C 546,936 574,912 574,876 C 574,850 548,820 512,766 Z'" \
  -fill none -stroke "$INK" -strokewidth 34 \
  -draw "stroke-linecap round path 'M 396,150 C 440,86 584,86 628,150'" \
  "$MASTER"

mark() { # mark <out> <size> <bg|none> [scale]
  local out="$1" size="$2" bg="$3" scale="${4:-1}"
  local inner
  inner=$(awk "BEGIN { printf \"%d\", $size * $scale }")
  convert -size "${size}x${size}" xc:"$bg" \
    \( "$MASTER" -resize "${inner}x${inner}" \) -gravity center -composite \
    "$out"
  echo "wrote $out"
}

# App icon: deep green mark on white, the app's light-first ground.
mark "$IMG/icon.png" 1024 "$PAPER" 0.62
# Splash: transparent, the splash background colour comes from app.json.
mark "$IMG/splash-icon.png" 512 none 1
# Web favicon.
mark "$IMG/favicon.png" 96 "$PAPER" 0.92
# Android adaptive icon: mark inside the 66% safe zone, white background, black monochrome.
mark "$IMG/android-icon-foreground.png" 1024 none 0.6
convert -size 1024x1024 xc:"$PAPER" "$IMG/android-icon-background.png"
convert "$MASTER" -resize 620x620 -background none -gravity center -extent 1024x1024 \
  -fill black -colorize 100 "$IMG/android-icon-monochrome.png"
echo "wrote android adaptive layers"
