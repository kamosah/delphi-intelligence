#!/bin/bash

# Download Visual References Script
# Purpose: Batch download visual references from external sources
# Usage: ./scripts/download-visual-references.sh
#
# ⚠️  WARNING: Direct downloads from mintcdn.com will fail due to CDN authentication.
# Use the Playwright approach (scripts/capture-screenshots.js) instead for Athena Intelligence assets.
# This script only downloads assets from external sources that allow direct access.

set -e

# Create directory structure
echo "Creating directory structure..."
mkdir -p docs/visual-references/{architecture,videos,case-studies}

echo ""
echo "ℹ️  Note: Athena Intelligence assets (mintcdn.com) cannot be downloaded directly."
echo "   Use: node scripts/capture-screenshots.js to capture those assets via Playwright."
echo ""
echo "Downloading external visual references..."
echo ""

# Architecture & Integration Diagrams (External sources only)
echo "📥 Downloading architecture diagrams..."

curl -o "docs/visual-references/architecture/memory-in-motion.avif" \
  "https://www.getzep.com/customers/memory-in-motion.avif"

curl -o "docs/visual-references/architecture/entity-diagram.avif" \
  "https://www.getzep.com/customers/entity-diagram.avif"

# Case Study Visuals
echo "📥 Downloading case study assets..."
curl -o "docs/visual-references/case-studies/langchain-case-study-header.png" \
  "https://blog.langchain.com/content/images/size/w1200/2024/07/Case-study---athena---ghost.png"

curl -o "docs/visual-references/case-studies/e2b-platform-screenshot.webp" \
  "https://cdn.prod.website-files.com/6731db4b7372e95e7d18a926/6797cc5f7270aefbda5d12df_6797cbb9d9e65f810402db97_hz4buhNcZoY3hiqY5FTVqura8g.webp"

curl -o "docs/visual-references/case-studies/e2b-code-execution.webp" \
  "https://cdn.prod.website-files.com/6731db4b7372e95e7d18a926/6797cc5f7270aefbda5d12e2_6797cbe0655304be4ba11617_JrlBxYOJGXvmJcOIRKDVodsk.webp"

curl -o "docs/visual-references/case-studies/e2b-team-collaboration.webp" \
  "https://cdn.prod.website-files.com/6731db4b7372e95e7d18a926/6797cc5f7270aefbda5d1312_6797cc2f27a9531930550d79_QzMWdFGLAPvuJ8xMcNOoTGS4Ws.webp"

curl -o "docs/visual-references/case-studies/datastax-interface.png" \
  "https://cdn.sanity.io/images/bbnkhnhl/production/d60342256fac4922c1443731ee3a76a6a5e74682-1742x982.png?w=3840&q=75&fit=clip&auto=format"

echo ""
echo "✅ Download complete!"
echo "📁 Assets saved to: docs/visual-references/"
echo ""
echo "Note: YouTube videos require yt-dlp. Install with: brew install yt-dlp"
echo "Then run:"
echo "  yt-dlp https://youtube.com/watch?v=0zkFLVS8FqQ -o docs/visual-references/videos/main-demo.mp4"
echo "  yt-dlp https://youtube.com/watch?v=kHRLeiMlpGc -o docs/visual-references/videos/settings-tutorial.mp4"
echo "  yt-dlp https://www.youtube.com/embed/uwoeoMAVIiE -o docs/visual-references/videos/team-interview.mp4"
echo ""
