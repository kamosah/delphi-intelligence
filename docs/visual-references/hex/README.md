# Hex Visual Reference Library

> **Purpose**: Catalog of visual assets captured from Hex for UI/UX design alignment
>
> **Last Updated**: 2025-10-25
>
> **Project Goal**: Adopt Hex's UI aesthetic across the entire Olympus platform

---

## Quick Access

All visual assets are organized in:

### 📸 Screenshots (8 files)

**Location**: `docs/visual-references/hex/screenshots/`

Successfully captured screenshots from Hex product pages:

- ✅ `hex-homepage-full.png` (8.9MB) - Homepage with product overview
- ✅ `hex-threads-announcement-full.png` (3.1MB) - Threads feature announcement
- ✅ `hex-docs-overview-full.png` (848K) - Documentation homepage
- ✅ `hex-ai-overview-full.png` (396K) - AI features overview
- ✅ `hex-sql-cells-full.png` - SQL cell interface documentation
- ✅ `hex-chart-cells-full.png` - Chart cell interface documentation
- ✅ `hex-data-connections-full.png` - Database connection UI
- ✅ `hex-semantic-layer-full.png` - Semantic modeling interface

### 🎬 Demo Videos (pending)

**Location**: `docs/visual-references/hex/videos/`

**Status**: Manual download required

**Hex YouTube Channel**: https://www.youtube.com/@_hex_tech/videos

**Videos to download** (priority features):

1. Threads conversational interface demo
2. Notebook Agent in action
3. SQL cells and polyglot notebooks
4. Database connections setup
5. Semantic modeling walkthrough
6. General product overview/tour

### 🖼️ Video Frames (pending)

**Location**: `docs/visual-references/hex/frames/`

**Status**: Awaiting video downloads

Frames will be extracted at 0.5 FPS (1 frame per 2 seconds) for UI-focused videos.

---

## How Assets Were Captured

### Screenshots (Automated)

- **Tool**: Playwright browser automation
- **Script**: `scripts/capture-hex-screenshots.ts`
- **Resolution**: 1920x1080
- **Success Rate**: 8/10 pages captured (2 timeouts)

### Videos (Manual Process Required)

**Step 1: Identify Videos**

1. Browse https://www.youtube.com/@_hex_tech/videos
2. Identify videos showing:
   - Threads chat interface
   - Notebook Agent workflows
   - SQL notebook cells
   - Database connection management
   - Semantic modeling features

**Step 2: Download Videos**

```bash
# Update scripts/download-hex-videos.sh with video URLs
# Then run:
./scripts/download-hex-videos.sh
```

**Step 3: Extract Frames**

```bash
# After videos are downloaded:
./scripts/extract-hex-video-frames.sh
```

---

## Documentation Sources

### Primary Pages (Captured)

- [Hex Homepage](https://hex.tech)
- [Introducing Threads](https://hex.tech/blog/introducing-threads/)
- [Introducing Notebook Agent](https://hex.tech/blog/introducing-notebook-agent/)
- [Fall 2025 Launch](https://hex.tech/blog/fall-2025-launch/)
- [Hex Docs](https://learn.hex.tech/docs)
- [AI Overview](https://learn.hex.tech/docs/getting-started/ai-overview)
- [SQL Cells](https://learn.hex.tech/docs/explore-data/cells/sql-cells)
- [Chart Cells](https://learn.hex.tech/docs/explore-data/cells/chart-cells)
- [Data Connections](https://learn.hex.tech/docs/connect-to-data/data-connections)
- [Semantic Layer](https://learn.hex.tech/docs/semantic-layer/semantic-layer)

### Video Sources (To Capture)

- [Hex YouTube Channel](https://www.youtube.com/@_hex_tech/videos)

---

## Usage for Development

### Viewing Screenshots

```bash
# Browse all screenshots
open docs/visual-references/hex/screenshots/

# View specific page
open docs/visual-references/hex/screenshots/hex-threads-announcement-full.png
```

### Playing Videos (After Download)

```bash
# Play video
open docs/visual-references/hex/videos/hex-threads-demo.mp4
```

### Browsing Frames (After Extraction)

```bash
# Browse frames
open docs/visual-references/hex/frames/

# View specific frame
open docs/visual-references/hex/frames/threads-demo_0001.png
```

---

## Updating Assets

### Capture New Screenshots

```bash
# Run automated capture script
npx tsx scripts/capture-hex-screenshots.ts

# Add more pages by editing scripts/capture-hex-screenshots.ts
```

### Download Videos

```bash
# 1. Browse Hex YouTube channel: https://www.youtube.com/@_hex_tech/videos
# 2. Update scripts/download-hex-videos.sh with video URLs
# 3. Run download script
./scripts/download-hex-videos.sh
```

### Extract Video Frames

```bash
# After videos are downloaded
./scripts/extract-hex-video-frames.sh
```

---

## Key Design Features Visible in Assets

### Threads Interface (from screenshots)

- Conversational chat layout
- Source-type indicators for responses
- Context panel (data sources, semantic models)
- Mobile-first responsive design

### Notebook Interface

- Polyglot cells (SQL + Python)
- AI Agent integration
- Cell output visualization
- Real-time collaboration indicators

### Database Connections

- Connection card UI
- Credential management
- Connection testing interface
- Multi-warehouse support (Snowflake, BigQuery, etc.)

### Semantic Layer

- Modeling workbench interface
- Entity relationship visualization
- Metric definitions
- Version history

---

## Asset Inventory

| Asset Type   | Count | Total Size | Format | Status         |
| ------------ | ----- | ---------- | ------ | -------------- |
| Screenshots  | 8     | ~13MB      | PNG    | ✅ Complete    |
| Demo videos  | 0     | -          | MP4    | ⏳ Pending     |
| Video frames | 0     | -          | PNG    | ⏳ Pending     |
| **Total**    | **8** | **~13MB**  | Mixed  | 🚧 In Progress |

---

## Next Steps

1. **Browse Hex YouTube Channel**: https://www.youtube.com/@_hex_tech/videos
2. **Identify 4-6 key demo videos** showing:
   - Threads UI
   - Notebook Agent
   - SQL cells
   - Database management
3. **Update `scripts/download-hex-videos.sh`** with video URLs
4. **Download videos** and extract frames
5. **Document design patterns** in `docs/HEX_DESIGN_SYSTEM.md`

---

## Notes

- All screenshots captured at 1920x1080 for high-quality reference
- Frame extraction rate: 0.5 FPS (UI-focused) to 0.33 FPS (overview videos)
- Videos require manual identification from YouTube channel
- Screenshots automation successful for most pages (2 timeout errors acceptable)

---

## Related Documentation

- [HEX_DESIGN_SYSTEM.md](../../HEX_DESIGN_SYSTEM.md) - Design patterns and component mapping
- [PRODUCT_REQUIREMENTS.md](../../PRODUCT_REQUIREMENTS.md) - Updated PRD with Hex hybrid approach
- [hex-component-mapping.md](../../guides/hex-component-mapping.md) - UI component planning
