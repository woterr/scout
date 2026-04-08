#!/bin/bash

CACHE="$HOME/.cache/vicinae-scout/content.json"

ROOTS=(
  "$HOME/Downloads"
  "$HOME/Pictures"
  "/mnt/work"
)

mkdir -p "$(dirname "$CACHE")"
[ -f "$CACHE" ] || echo "{}" > "$CACHE"

declare -A LAST_UPDATED
DEBOUNCE_MS=1000

now_ms() {
  date +%s%3N
}

extract_text() {
  local file="$1"

  pages=$(pdfinfo "$file" 2>/dev/null | awk '/Pages:/ {print $2}')
  [ -z "$pages" ] && pages=1

  if [ "$pages" -le 10 ]; then
    pdftotext "$file" - 2>/dev/null
  else
    pdftotext -f 1 -l 1 "$file" - 2>/dev/null
  fi | tr '[:upper:]' '[:lower:]'
}

update_cache() {
  local file="$1"

  mtime=$(stat -c %Y "$file" 2>/dev/null)
  [ -z "$mtime" ] && return

  text=$(extract_text "$file")

  tmp=$(mktemp)

  jq --arg path "$file" \
     --arg text "$text" \
     --argjson mtime "$mtime" \
     '.[$path] = {mtime: $mtime, text: $text}' \
     "$CACHE" > "$tmp" && mv "$tmp" "$CACHE"

  echo "[UPDATED] $file"
}

delete_cache() {
  local file="$1"

  tmp=$(mktemp)

  jq "del(.\"$file\")" "$CACHE" > "$tmp" && mv "$tmp" "$CACHE"

  echo "[DELETED] $file"
}

for root in "${ROOTS[@]}"; do
  inotifywait -m -r \
    -e close_write -e moved_to -e delete \
    --format '%w%f %e' "$root" |
  while read file event; do

    [[ "$file" != *.pdf ]] && continue

    now=$(now_ms)
    last=${LAST_UPDATED["$file"]}

    if [[ -n "$last" ]]; then
      diff=$((now - last))
      if [[ $diff -lt $DEBOUNCE_MS ]]; then
        continue
      fi
    fi

    LAST_UPDATED["$file"]=$now

    if [[ "$event" == *"DELETE"* ]]; then
      delete_cache "$file"
    else
      update_cache "$file"
    fi

  done &
done

wait
