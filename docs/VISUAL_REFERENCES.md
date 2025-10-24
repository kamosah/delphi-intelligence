# Athena Intelligence Visual Reference Library

> **Purpose**: Catalog of visual assets captured from Athena Intelligence documentation for MVP development reference.
>
> **Last Updated**: 2025-10-23
>
> **Assets Captured**: 215 total (39 screenshots + 173 video frames + 3 videos)

---

## Quick Access

All visual assets have been captured using automated tools and are available in:

### 📸 Screenshots (39 files)

**Location**: `docs/visual-references/automated/`

Full-page and component-level screenshots captured from documentation:

- Chat Application interface
- Notebooks application
- Workbench context management
- Getting Started guides
- Working with Olympus
- Voice features
- Platform overview
- Agent configuration

### 🎬 Demo Videos (3 files)

**Location**: `docs/visual-references/videos/`

- `main-demo.mp4` (48 MB) - Main product demonstration
- `settings-tutorial.mp4` (14 MB) - Settings and configuration
- `team-interview.mp4` (83 MB) - Team discussing features

### 🖼️ Video Frames (173 files)

**Location**: `docs/visual-references/frames/`

Extracted frames showing UI states at key moments:

- `main-demo_####.png` (79 frames)
- `settings_####.png` (28 frames)
- `team_####.png` (66 frames)

---

## How Assets Were Captured

Due to CDN authentication requirements on Athena Intelligence's image hosting (mintcdn.com), direct downloads are not possible. All assets were captured using automated tools:

1. **Playwright Browser Automation** - Renders documentation pages in headless browser to capture screenshots
2. **YouTube Video Download** - Downloads demo videos using yt-dlp
3. **FFmpeg Frame Extraction** - Extracts key frames from videos at regular intervals

**For complete automation instructions**, see [AUTOMATED_VISUAL_CAPTURE_GUIDE.md](./AUTOMATED_VISUAL_CAPTURE_GUIDE.md)

---

## Documentation Sources

All captured assets originate from official Athena Intelligence documentation:

### Primary Documentation Pages

- [Chat Application](https://resources.athenaintel.com/docs/applications/chat)
- [Notebooks](https://resources.athenaintel.com/docs/applications/notebooks)
- [Workbench](https://resources.athenaintel.com/docs/contextual-knowledge/workbench)
- [Getting Started](https://resources.athenaintel.com/docs/getting-started/using-athena)
- [Working with Olympus](https://resources.athenaintel.com/docs/getting-started/working-with-olympus)
- [Voice Features](https://resources.athenaintel.com/docs/applications/voice)
- [Olympus Platform](https://resources.athenaintel.com/docs/getting-started/olympus)
- [Athena Agent](https://resources.athenaintel.com/docs/getting-started/athena)

### Demo Videos (YouTube)

- Main Product Demo: https://www.youtube.com/embed/mDr55cXZYPU
- Settings Tutorial: https://www.youtube.com/embed/3TcpmQLsqPg
- Team Interview: https://www.youtube.com/embed/uwoeoMAVIiE

---

## Usage for Development

### Viewing Screenshots

```bash
# Browse all screenshots
open docs/visual-references/automated/

# View specific page
open docs/visual-references/automated/chat-application-full.png
```

### Playing Videos

```bash
# Play main demo
open docs/visual-references/videos/main-demo.mp4
```

### Browsing Frames

```bash
# Browse extracted frames
open docs/visual-references/frames/

# View frames from specific video
open docs/visual-references/frames/main-demo_0001.png
```

---

## Updating Assets

To refresh or add new assets, use the automation scripts:

```bash
# Capture new screenshots from documentation
node scripts/capture-screenshots.js

# Extract frames from videos
./scripts/extract-video-frames.sh
```

Edit `scripts/capture-screenshots.js` to add more documentation pages to capture.

---

## Key Features Visible in Assets

The captured assets show the following Athena Intelligence features:

### Chat Interface

- File attachment and drag-and-drop
- Web search toggle
- Versatile toolkits (Document, Spaces, Spreadsheet, Notebook, Email, Canvas, App, Python)
- Agent personas (Chat, Assist, Deep Think)
- Context configuration (Knowledge base, Memories, Workbench)
- Advanced options (Learning Mode, Effort Dial, LLM Selector)

### Notebooks

- Query interface
- Result visualization
- Cell-based structure
- Data analysis features

### Workbench

- Asset management
- Space organization
- Document collection
- Context building

### Voice Features

- Voice activation
- Audio transcription
- Voice command execution

### Platform

- Dashboard layout
- Application suite navigation
- User workspace organization
- Authentication flows

---

## Asset Inventory

| Asset Type            | Count   | Total Size  | Format                       |
| --------------------- | ------- | ----------- | ---------------------------- |
| Full-page screenshots | 8       | ~2.8 MB     | PNG (1920x1080+)             |
| Component screenshots | 31      | ~2.8 MB     | PNG (various sizes)          |
| Demo videos           | 3       | 145 MB      | MP4 (converted from MPEG-TS) |
| Video frames          | 173     | ~164 MB     | PNG (1920px wide)            |
| **Total**             | **215** | **~315 MB** | Mixed                        |

---

## Notes

- All screenshots captured at 1920x1080 resolution for high quality reference
- Videos converted from MPEG-TS to MP4 format for compatibility
- Frame extraction rate: 0.5 FPS for main demo, 0.33 FPS for settings, 0.2 FPS for interview
- CDN authentication signatures prevent direct image downloads from mintcdn.com
- Playwright automation successfully bypasses signature requirement by rendering pages
