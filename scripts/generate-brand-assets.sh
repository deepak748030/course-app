#!/usr/bin/env bash
# Generates the app icon set from the Rasoi Studio brand mark: a cooking bowl with rising
# steam and a play triangle. Geometry matches the in-app vector mark in src/components/marks.tsx.
#
# The mark is drawn once at 512px and scaled, so every icon size comes from the same source of
# truth and nothing has to be re-exported by hand when the mark changes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMG="$ROOT/assets/images"
MASTER="$(mktemp -d)/mark.png"

PAPER='#FAF7F2'
PRIMARY='#9F3F2F'

# 1. Master mark, transparent background.
convert -size 512x512 xc:none \
  -draw "fill none stroke $PRIMARY stroke-width 13 stroke-linecap round path 'M 172,262 C 188,242 156,224 172,198'" \
  -draw "fill none stroke $PRIMARY stroke-width 13 stroke-linecap round path 'M 344,262 C 360,242 328,224 344,198'" \
  -draw "fill $PRIMARY stroke $PRIMARY stroke-width 24 stroke-linejoin round polygon 232,184 232,246 286,215" \
  -draw "fill none stroke $PRIMARY stroke-width 30 stroke-linecap round line 122,284 390,284" \
  -draw "fill none stroke $PRIMARY stroke-width 30 stroke-linecap round path 'M 144,284 Q 256,418 368,284'" \
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

# App icon: terracotta mark on warm paper.
mark "$IMG/icon.png" 1024 "$PAPER" 0.62
# Splash: transparent, the splash background colour comes from app.json.
mark "$IMG/splash-icon.png" 512 none 1
# Web favicon.
mark "$IMG/favicon.png" 96 "$PAPER" 0.92
# Android adaptive icon: mark inside the 66% safe zone, paper background, black monochrome.
mark "$IMG/android-icon-foreground.png" 1024 none 0.6
convert -size 1024x1024 xc:"$PAPER" "$IMG/android-icon-background.png"
convert "$MASTER" -resize 620x620 -background none -gravity center -extent 1024x1024 \
  -fill black -colorize 100 "$IMG/android-icon-monochrome.png"
echo "wrote android adaptive layers"
