#!/bin/bash

# Extract Video Frames Script
# Purpose: Extract key frames from YouTube demo videos for visual reference
# Usage: ./scripts/extract-video-frames.sh

set -e

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ Error: ffmpeg is not installed"
    echo "Install with: brew install ffmpeg"
    exit 1
fi

# Create output directory
mkdir -p docs/visual-references/frames

echo "🎬 Extracting frames from demo videos..."
echo ""

# Function to extract frames from a video
extract_frames() {
    local video_file=$1
    local output_prefix=$2
    local fps=${3:-0.5}  # Default: 1 frame every 2 seconds

    if [ ! -f "$video_file" ]; then
        echo "⚠️  Video not found: $video_file"
        return
    fi

    echo "📹 Processing: $(basename $video_file)"

    # Extract frames at specified FPS
    ffmpeg -i "$video_file" \
        -vf "fps=$fps,scale=1920:-1" \
        -q:v 2 \
        "docs/visual-references/frames/${output_prefix}_%04d.png" \
        -hide_banner \
        -loglevel error

    local frame_count=$(ls -1 docs/visual-references/frames/${output_prefix}_*.png 2>/dev/null | wc -l)
    echo "   ✅ Extracted $frame_count frames"
    echo ""
}

# Extract frames from each video
# Main demo video (1 frame every 2 seconds)
extract_frames \
    "docs/visual-references/videos/main-demo.mp4" \
    "main-demo" \
    0.5

# Settings tutorial (1 frame every 3 seconds)
extract_frames \
    "docs/visual-references/videos/settings-tutorial.mp4" \
    "settings" \
    0.33

# Team interview (1 frame every 5 seconds - less dense)
extract_frames \
    "docs/visual-references/videos/team-interview.mp4" \
    "team" \
    0.2

echo "✅ Frame extraction complete!"
echo "📁 Frames saved to: docs/visual-references/frames/"
echo ""
echo "Tip: Review frames and delete duplicates or low-quality captures"
echo "     to keep only the most useful UI screenshots."
