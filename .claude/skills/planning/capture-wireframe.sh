#!/usr/bin/env bash
# Capture an HTML wireframe as a hi-DPI PNG using headless Chrome.
# Auto-measures document height to prevent bottom clipping.
#
# Usage:
#   bash .claude/skills/planning/capture-wireframe.sh <html-file> [output-png] [width]
#
# Arguments:
#   html-file   Path to the HTML file (e.g., /tmp/wireframe-layout.html)
#   output-png  Output PNG path (default: replaces .html with .png)
#   width       Viewport width in CSS pixels (default: 1200)
#
# Examples:
#   bash .claude/skills/planning/capture-wireframe.sh /tmp/wireframe-layout.html
#   bash .claude/skills/planning/capture-wireframe.sh /tmp/wf.html /tmp/wf.png 1400

set -euo pipefail

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
HTML_FILE="${1:?Usage: capture-wireframe.sh <html-file> [output-png] [width]}"
OUTPUT="${2:-${HTML_FILE%.html}.png}"
WIDTH="${3:-1200}"
PADDING=60

# Resolve to absolute path for file:// URL
HTML_ABS="$(cd "$(dirname "$HTML_FILE")" && pwd)/$(basename "$HTML_FILE")"

if [[ ! -f "$HTML_ABS" ]]; then
  echo "Error: HTML file not found: $HTML_ABS" >&2
  exit 1
fi

# Helper: extract a console.log value from Chrome's --enable-logging output.
# Usage: chrome_eval <window-size> <js-expression>
chrome_eval() {
  local winsize="$1" js="$2"
  local tmp="/tmp/_capture_eval_$$.html"
  cat > "$tmp" << EVALEOF
<!DOCTYPE html><html><body>
<script>console.log("__RESULT__:" + ($js));</script>
</body></html>
EVALEOF
  local val
  val=$("$CHROME" --headless=new --disable-gpu \
    --window-size="$winsize" \
    --enable-logging=stderr --v=0 \
    --dump-dom "file://$tmp" 2>&1 \
    | sed -n 's/.*"__RESULT__:\([^"]*\)".*/\1/p' \
    | head -1)
  rm -f "$tmp"
  echo "$val"
}

# --- Step 1: Measure Chrome's window chrome offset ---
# --window-size sets outer window size, not viewport. Headless Chrome still
# has a non-zero chrome offset (~87px on macOS). Measure it dynamically.
PROBE_HEIGHT=500
INNER=$(chrome_eval "${WIDTH},${PROBE_HEIGHT}" "window.innerHeight")
CHROME_OFFSET=$((PROBE_HEIGHT - INNER))

# --- Step 2: Measure document content height ---
# Use a small viewport so scrollHeight reflects actual content, not viewport.
# The viewport must be smaller than expected content for this to work.
MEASURE_HTML="/tmp/_capture_measure_$$.html"
cp "$HTML_ABS" "$MEASURE_HTML"
cat >> "$MEASURE_HTML" << 'MEASURE'
<script>console.log("__RESULT__:" + document.documentElement.scrollHeight);</script>
MEASURE

CONTENT_HEIGHT=$("$CHROME" --headless=new --disable-gpu \
  --window-size="${WIDTH},$((100 + CHROME_OFFSET))" \
  --enable-logging=stderr --v=0 \
  --dump-dom "file://${MEASURE_HTML}" 2>&1 \
  | sed -n 's/.*"__RESULT__:\([^"]*\)".*/\1/p' \
  | head -1)
rm -f "$MEASURE_HTML"

# Fallback if measurement failed
if [[ -z "$CONTENT_HEIGHT" || "$CONTENT_HEIGHT" -eq 0 ]] 2>/dev/null; then
  CONTENT_HEIGHT=3000
  echo "Warning: Could not measure document height, using fallback ${CONTENT_HEIGHT}px" >&2
fi

# --- Step 3: Capture screenshot ---
# window-size = content height + padding + chrome offset
WINDOW_HEIGHT=$((CONTENT_HEIGHT + PADDING + CHROME_OFFSET))

"$CHROME" \
  --headless=new --disable-gpu \
  --force-device-scale-factor=2 \
  --screenshot="$OUTPUT" \
  --window-size="${WIDTH},${WINDOW_HEIGHT}" \
  "file://${HTML_ABS}" 2>/dev/null || true

if [[ -f "$OUTPUT" ]]; then
  echo "Captured: $OUTPUT (content: ${CONTENT_HEIGHT}px, viewport: ${WIDTH}x$((CONTENT_HEIGHT + PADDING)), 2x DPI)"
else
  echo "Error: Chrome screenshot failed" >&2
  exit 1
fi
