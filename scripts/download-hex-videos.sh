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
# TODO: Replace these placeholder URLs with actual Hex demo videos
# Focus on videos showing:
#   - Threads conversational interface
#   - Notebook Agent in action
#   - SQL cells and polyglot notebooks
#   - Database connections
#   - Semantic modeling
#   - General product demos

# Example video downloads (update with actual video IDs from channel)
# Format: yt-dlp <VIDEO_URL> -o <OUTPUT_PATH>

echo "⚠️  Video URLs need to be added"
echo ""
echo "To add videos, browse https://www.youtube.com/@_hex_tech/videos"
echo "and update this script with relevant demo video URLs"
echo ""
echo "Example usage:"
echo "  yt-dlp https://youtube.com/watch?v=VIDEO_ID -o $OUTPUT_DIR/hex-threads-demo.mp4"
echo ""

# Uncomment and update with actual video IDs when found:
#
# echo "📹 Downloading: Hex Threads Demo..."
# yt-dlp https://youtube.com/watch?v=THREADS_VIDEO_ID \
#   -o "$OUTPUT_DIR/hex-threads-demo.mp4"
#
# echo "📹 Downloading: Hex Notebook Agent Demo..."
# yt-dlp https://youtube.com/watch?v=NOTEBOOK_VIDEO_ID \
#   -o "$OUTPUT_DIR/hex-notebook-agent-demo.mp4"
#
# echo "📹 Downloading: Hex SQL Notebooks..."
# yt-dlp https://youtube.com/watch?v=SQL_VIDEO_ID \
#   -o "$OUTPUT_DIR/hex-sql-notebooks-demo.mp4"
#
# echo "📹 Downloading: Hex Product Overview..."
# yt-dlp https://youtube.com/watch?v=OVERVIEW_VIDEO_ID \
#   -o "$OUTPUT_DIR/hex-product-overview.mp4"

echo ""
echo "✅ Script ready for video downloads"
echo "📝 Next step: Identify relevant videos from Hex's YouTube channel"
echo ""
