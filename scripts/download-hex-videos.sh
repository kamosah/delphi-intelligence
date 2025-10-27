#!/bin/bash

# Download Hex Demo Videos Script
# Purpose: Download demo videos from Hex's YouTube channel for UI/UX reference
# Usage: ./scripts/download-hex-videos.sh
#
# Prerequisites: yt-dlp (install with: brew install yt-dlp)

set -e

# Check if yt-dlp is installed
if ! command -v yt-dlp &> /dev/null; then
    echo "❌ yt-dlp is not installed"
    echo "Install with: brew install yt-dlp"
    exit 1
fi

# Create output directory
OUTPUT_DIR="docs/visual-references/hex/videos"
mkdir -p "$OUTPUT_DIR"

echo "📥 Downloading Hex demo videos from YouTube..."
echo "📁 Saving to: $OUTPUT_DIR"
echo ""

# Hex YouTube Channel: https://www.youtube.com/@_hex_tech/videos
#
# Videos identified for UI/UX reference (6 total):
# 1. Notebook Agent demo
# 2. Fall 2025 launch (Agents + Semantic Model)
# 3. Threads conversational interface demo
# 4. SQL cells and polyglot notebooks
# 5. Database connections (Cube integration)
# 6. Database connections (setup walkthrough)

# Download videos at 1080p max resolution for optimal frame extraction
# Format: best video+audio up to 1080p, merge into mp4

echo "📹 Downloading: Notebook Agent Demo..."
yt-dlp "https://www.youtube.com/watch?v=utOLApsGvrU" \
  -f "best[height<=1080]" \
  -o "$OUTPUT_DIR/01-notebook-agent-demo.%(ext)s"

echo "📹 Downloading: Fall 2025 Launch (Agents + Semantic Model)..."
yt-dlp "https://www.youtube.com/watch?v=oYpizZJtvOo" \
  -f "best[height<=1080]" \
  -o "$OUTPUT_DIR/02-fall-2025-launch-agents.%(ext)s"

echo "📹 Downloading: Threads Conversational Interface (Agentic AI)..."
yt-dlp "https://www.youtube.com/watch?v=hUiXdjrsu8E" \
  -f "best[height<=1080]" \
  -o "$OUTPUT_DIR/03-threads-agentic-ai.%(ext)s"

echo "📹 Downloading: SQL Cells - Chained SQL Demo..."
yt-dlp "https://www.youtube.com/watch?v=Zrq_n-_ntrc" \
  -f "best[height<=1080]" \
  -o "$OUTPUT_DIR/04-sql-cells-chained-queries.%(ext)s"

echo "📹 Downloading: Database Connections - Cube Integration..."
yt-dlp "https://www.youtube.com/watch?v=yt6YbDirnJI" \
  -f "best[height<=1080]" \
  -o "$OUTPUT_DIR/05-database-connections-cube.%(ext)s"

echo "📹 Downloading: Database Connections - Setup Walkthrough..."
yt-dlp "https://www.youtube.com/watch?v=wIUnMHk7cms" \
  -f "best[height<=1080]" \
  -o "$OUTPUT_DIR/06-database-connections-setup.%(ext)s"

echo ""
echo "✅ All 6 Hex demo videos downloaded successfully"
echo "📁 Location: $OUTPUT_DIR"
echo "📝 Next step: Run ./scripts/extract-hex-video-frames.sh to extract UI frames"
echo ""
