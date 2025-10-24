#!/bin/bash

# Download Visual References Script
# Purpose: Batch download all Athena Intelligence visual references
# Usage: ./scripts/download-visual-references.sh

set -e

# Create directory structure
echo "Creating directory structure..."
mkdir -p docs/visual-references/{platform-overview,chat-interface,notebooks,workbench,voice,document-intelligence,architecture,videos,case-studies}

# Platform Overview & Dashboard
echo "Downloading platform overview assets..."
curl -o "docs/visual-references/platform-overview/athena-dashboard.png" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/5eCfhbA_WRlZ_k38/images/athena-dashboard.png"

curl -o "docs/visual-references/platform-overview/working-with-olympus.png" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/3MUUUj2mDzQWp3GK/images/working-with-olympus.png"

curl -o "docs/visual-references/platform-overview/login-step1.png" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/kqyrQFIhheXcGlzW/images/login-step1.png"

curl -o "docs/visual-references/platform-overview/login-step2.png" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/kqyrQFIhheXcGlzW/images/login-step2.png"

curl -o "docs/visual-references/platform-overview/olympus-video.mp4" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/25rXUBjFxj5xgRFn/images/olympus-video.mp4"

# Chat Application Interface
echo "Downloading chat interface assets..."
curl -o "docs/visual-references/chat-interface/chat-step1-file-attachment.png" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/5eCfhbA_WRlZ_k38/images/chat-step1.png"

curl -o "docs/visual-references/chat-interface/chat-step2-web-search.png" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/5eCfhbA_WRlZ_k38/images/chat-step2.png"

curl -o "docs/visual-references/chat-interface/chat-step3-toolkits.png" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/5eCfhbA_WRlZ_k38/images/chat-step3.png"

curl -o "docs/visual-references/chat-interface/chat-step4-agent-personas.png" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/Ct7_t-b6TX9cTSq0/images/chat-step4.png"

curl -o "docs/visual-references/chat-interface/chat-step5-context-config.png" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/Ct7_t-b6TX9cTSq0/images/chat-step5.png"

curl -o "docs/visual-references/chat-interface/chat-step6-options-menu.png" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/Ct7_t-b6TX9cTSq0/images/chat-step6.png"

curl -o "docs/visual-references/chat-interface/chat-video.mp4" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/Ct7_t-b6TX9cTSq0/images/chat-video.mp4"

# Notebooks & Query Interface
echo "Downloading notebooks assets..."
curl -o "docs/visual-references/notebooks/notebooks-video.mp4" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/25rXUBjFxj5xgRFn/images/notebooks-video.mp4"

curl -o "docs/visual-references/notebooks/notebook-feature1-sidebar.png" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/25rXUBjFxj5xgRFn/images/notebook-feature1.png"

curl -o "docs/visual-references/notebooks/notebook-feature2.1-text-output.png" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/25rXUBjFxj5xgRFn/images/notebook-feature2.1.png"

curl -o "docs/visual-references/notebooks/notebook-feature2.2-code-output.png" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/25rXUBjFxj5xgRFn/images/notebook-feature2.2.png"

curl -o "docs/visual-references/notebooks/notebook-feature3-dataset-loading.png" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/25rXUBjFxj5xgRFn/images/notebook-feature3.png"

# Workbench & Context Management
echo "Downloading workbench assets..."
curl -o "docs/visual-references/workbench/workbench-video.mp4" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/3MUUUj2mDzQWp3GK/images/workbench.mp4"

curl -o "docs/visual-references/workbench/wb-step1-opening-spaces.png" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/3MUUUj2mDzQWp3GK/images/wb-step1.png"

curl -o "docs/visual-references/workbench/wb-step2-adding-assets.png" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/3MUUUj2mDzQWp3GK/images/wb-step2.png"

curl -o "docs/visual-references/workbench/wb-step3-user-interaction.png" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/3MUUUj2mDzQWp3GK/images/wb-step3.png"

# Voice Features
echo "Downloading voice features assets..."
curl -o "docs/visual-references/voice/voice-video.mp4" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/3MUUUj2mDzQWp3GK/images/voice-video.mp4"

curl -o "docs/visual-references/voice/voice-step1-navigate.png" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/fkVT3T4XWKid_IQj/images/voice-step1.png"

curl -o "docs/visual-references/voice/voice-step2-activate.png" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/fkVT3T4XWKid_IQj/images/voice-step2.png"

curl -o "docs/visual-references/voice/voice-step3-execute.png" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/3MUUUj2mDzQWp3GK/images/voice-step3.png"

# Document Intelligence & Citations
echo "Downloading document intelligence assets..."
curl -o "docs/visual-references/document-intelligence/filetypes.png" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/QeBe9aVLwI_LnsjV/images/filetypes.png"

curl -o "docs/visual-references/document-intelligence/citations.png" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/Ct7_t-b6TX9cTSq0/images/citations.png"

curl -o "docs/visual-references/document-intelligence/analyze-step1-upload.mp4" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/5eCfhbA_WRlZ_k38/images/analyze-step1.mp4"

curl -o "docs/visual-references/document-intelligence/analyze-step2-interaction.mp4" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/5eCfhbA_WRlZ_k38/images/analyze-step2.mp4"

curl -o "docs/visual-references/document-intelligence/web-step1-prompt.png" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/3MUUUj2mDzQWp3GK/images/web-step1.png"

curl -o "docs/visual-references/document-intelligence/web-step2-doc-creation.png" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/3MUUUj2mDzQWp3GK/images/web-step2.png"

curl -o "docs/visual-references/document-intelligence/athena-video.mp4" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/5eCfhbA_WRlZ_k38/images/athena-video.mp4"

# Architecture & Integration Diagrams
echo "Downloading architecture diagrams..."
curl -o "docs/visual-references/architecture/data-integrations.png" \
  "https://mintcdn.com/athenaintelligence-e46bc9d3/Ct7_t-b6TX9cTSq0/images/data-integrations.png"

curl -o "docs/visual-references/architecture/memory-in-motion.avif" \
  "https://www.getzep.com/customers/memory-in-motion.avif"

curl -o "docs/visual-references/architecture/entity-diagram.avif" \
  "https://www.getzep.com/customers/entity-diagram.avif"

# Case Study Visuals
echo "Downloading case study assets..."
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
