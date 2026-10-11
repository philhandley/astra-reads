#!/usr/bin/env bash
# Usage: tools/shot.sh <name> <url-path-and-hash> [W,H] [virtual-ms]
# Takes a headless Chrome screenshot of http://127.0.0.1:8300/<path> into tools/shots/ and prints console lines.
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/shots"
mkdir -p "$OUT"
NAME="$1"; PATHQ="$2"; SIZE="${3:-1280,800}"; VT="${4:-5000}"
rm -rf "$OUT/profile-$NAME"
timeout 120 "/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --enable-unsafe-swiftshader --use-angle=swiftshader \
  --no-first-run --user-data-dir="$OUT/profile-$NAME" --window-size="$SIZE" --virtual-time-budget="$VT" \
  --enable-logging=stderr --v=0 --screenshot="$OUT/$NAME.png" "http://127.0.0.1:8300/$PATHQ" 2>&1 | grep -E "CONSOLE" | sed -E 's/^.*CONSOLE[^"]*"//' | head -40
rm -rf "$OUT/profile-$NAME"
echo "-> $OUT/$NAME.png"
