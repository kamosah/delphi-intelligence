#!/bin/bash

# Extract Hex Video Frames Script
# Purpose: Extract key frames from Hex demo videos for UI/UX design reference
# Usage: ./scripts/extract-hex-video-frames.sh

set -e

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ Error: ffmpeg is not installed"
    echo "Install with: brew install ffmpeg"
    exit 1
fi

# Create output directory
OUTPUT_DIR="docs/visual-references/hex/frames"
mkdir -p "$OUTPUT_DIR"

echo "🎬 Extracting frames from Hex demo videos..."
echo ""

# Function to extract frames from a video
extract_frames() {
    local video_file=$1
    local output_prefix=$2
    local fps=${3:-0.5}  # Default: 0.5 fps (1 frame every 2 seconds)

    if [ ! -f "$video_file" ]; then
        echo "⚠️  Video not found: $video_file (skipping)"
        return
    fi

    echo "📹 Processing: $(basename $video_file)"

    # Extract frames at specified FPS
    ffmpeg -i "$video_file" \
        -vf "fps=$fps,scale=1920:-1" \
        -q:v 2 \
        "$OUTPUT_DIR/${output_prefix}_%04d.png" \
        -hide_banner \
        -loglevel error

    local frame_count=$(ls -1 $OUTPUT_DIR/${output_prefix}_*.png 2>/dev/null | wc -l)
    echo "   ✅ Extracted $frame_count frames"
    echo ""
}

# Extract frames from each Hex video
# Adjust FPS based on video type (higher FPS for UI-focused demos, lower for overviews)

# 01 - Notebook Agent demo - UI-focused (1 frame every 2 seconds)
extract_frames \
    "docs/visual-references/hex/videos/01-notebook-agent-demo.mp4" \
    "01-notebook-agent" \
    0.5

# 02 - Fall 2025 Launch (Agents + Semantic Model) - Overview (1 frame every 3 seconds)
extract_frames \
    "docs/visual-references/hex/videos/02-fall-2025-launch-agents.mp4" \
    "02-fall-2025-agents" \
    0.33

# 03 - Threads Conversational Interface - UI-focused (1 frame every 2 seconds)
extract_frames \
    "docs/visual-references/hex/videos/03-threads-agentic-ai.mp4" \
    "03-threads-agentic-ai" \
    0.5

# 04 - SQL Cells (Chained Queries) - UI-focused (1 frame every 2 seconds)
extract_frames \
    "docs/visual-references/hex/videos/04-sql-cells-chained-queries.mp4" \
    "04-sql-cells" \
    0.5

# 05 - Database Connections (Cube) - UI-focused (1 frame every 2 seconds)
extract_frames \
    "docs/visual-references/hex/videos/05-database-connections-cube.mp4" \
    "05-db-connections-cube" \
    0.5

# 06 - Database Connections (Setup) - UI-focused (1 frame every 2 seconds)
extract_frames \
    "docs/visual-references/hex/videos/06-database-connections-setup.mp4" \
    "06-db-connections-setup" \
    0.5

echo "✅ Frame extraction complete!"
echo "📁 Frames saved to: $OUTPUT_DIR"
echo ""
echo "Next steps:"
echo "1. Review frames in $OUTPUT_DIR"
echo "2. Delete duplicates or low-quality captures"
echo "3. Document design patterns found in frames"
echo "4. Update HEX_DESIGN_SYSTEM.md with visual references"
echo ""
