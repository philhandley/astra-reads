#!/usr/bin/env bash
# Download generated pictures and bring them into the app.
# Usage: bash tools/fetch_imgs.sh <<'LIST'
#   dino-1 p05 https://www.figma.com/api/mcp/asset/....png
# LIST
# Raw PNGs are kept in the scratch folder named by $RAW (default: tools/shots/raw).
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HERE")"
RAW="${RAW:-$HERE/shots/raw}"
while read -r book name url; do
  [ -z "$book" ] && continue
  mkdir -p "$RAW/$book"
  if curl -sfL -o "$RAW/$book/$name.png" "$url"; then
    (cd "$ROOT" && python -I tools/img_in.py "$book" "$name" "$RAW/$book/$name.png")
  else
    echo "FAILED $book/$name"
  fi
done
