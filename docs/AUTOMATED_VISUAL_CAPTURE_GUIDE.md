# Automated Visual Capture Guide

> **Challenge**: Most visual assets from Athena Intelligence documentation are hosted on `mintcdn.com` with authentication signatures, preventing direct downloads.
>
> **Solution**: This guide provides automated approaches to capture visual references by rendering pages in a browser and extracting frames from demo videos.

---

## Quick Summary

We've implemented **3 automated approaches** to capture visual references:

1. ✅ **YouTube Video Downloads** - 3 demo videos (145 MB total, proper MP4 format)
2. ✅ **Playwright Screenshot Capture** - 39 screenshots from documentation pages
3. ✅ **Video Frame Extraction** - 173 frames extracted from videos using ffmpeg

---

## Approach 1: YouTube Video Downloads

### What We Have

✅ **3 downloaded and converted demo videos** (total: 145 MB):

- `main-demo.mp4` (48 MB) - Main product demonstration
- `settings-tutorial.mp4` (14 MB) - Settings and configuration
- `team-interview.mp4` (83 MB) - Team discussing features

**Note**: Videos were originally downloaded as MPEG-TS and converted to proper MP4 format using ffmpeg for compatibility.

### How to Use

Videos are already downloaded to `docs/visual-references/videos/`. You can:

```bash
# Play videos to identify UI patterns
open docs/visual-references/videos/main-demo.mp4

# Or extract frames (see Approach 3 below)
./scripts/extract-video-frames.sh
```

### Value

- **High quality** UI screenshots from actual product usage
- Shows **live interactions** and workflows
- Captures **multiple screen states** not visible in static screenshots

---

## Approach 2: Automated Screenshot Capture with Playwright

### What It Does

Visits Athena Intelligence documentation pages in a headless browser and captures:

- Full-page screenshots of each documentation page
- Individual images embedded on the page
- Bypasses CDN signature requirements by rendering pages

### Installation

```bash
# Install Playwright (one-time setup)
npm install playwright

# Install browser drivers
npx playwright install
```

### Usage

```bash
# From project root
node scripts/capture-screenshots.js
```

This will create screenshots in `docs/visual-references/automated/`:

```
docs/visual-references/automated/
├── chat-application-full.png          # Full page screenshot
├── chat-application-image-1.png       # Extracted image 1
├── chat-application-image-2.png       # Extracted image 2
├── notebooks-application-full.png
├── workbench-full.png
├── getting-started-full.png
├── working-with-olympus-full.png
├── voice-features-full.png
├── olympus-platform-full.png
└── athena-agent-full.png
```

### Actual Output

- **8 full-page screenshots** (high resolution: 1920x1080+)
- **31 individual UI component screenshots**
- **39 total screenshots** successfully captured
- **Total size**: ~5.6 MB

### Pages Captured

1. Chat Application - https://resources.athenaintel.com/docs/applications/chat
2. Notebooks - https://resources.athenaintel.com/docs/applications/notebooks
3. Workbench - https://resources.athenaintel.com/docs/contextual-knowledge/workbench
4. Getting Started - https://resources.athenaintel.com/docs/getting-started/using-athena
5. Working with Olympus - https://resources.athenaintel.com/docs/getting-started/working-with-olympus
6. Voice Features - https://resources.athenaintel.com/docs/applications/voice
7. Olympus Platform - https://resources.athenaintel.com/docs/getting-started/olympus
8. Athena Agent - https://resources.athenaintel.com/docs/getting-started/athena

### Customization

Edit `scripts/capture-screenshots.js` to:

- Add more pages to capture
- Change viewport size (default: 1920x1080)
- Adjust wait times for slow-loading pages
- Enable headful mode (see the browser in action)

---

## Approach 3: Extract Frames from Videos

### What It Does

Uses `ffmpeg` to extract key frames from downloaded YouTube videos at specified intervals.

### Installation

```bash
# Install ffmpeg (macOS)
brew install ffmpeg

# Or check if already installed
ffmpeg -version
```

### Usage

```bash
# Extract frames from all 3 videos
./scripts/extract-video-frames.sh
```

This creates frames in `docs/visual-references/frames/`:

```
docs/visual-references/frames/
├── main-demo_0001.png       # Frame 1 from main demo
├── main-demo_0002.png       # Frame 2 (2 seconds later)
├── main-demo_0003.png
├── ...
├── settings_0001.png        # Settings tutorial frames
├── settings_0002.png
├── ...
├── team_0001.png            # Team interview frames
└── ...
```

### Actual Output

- **Main demo**: 79 frames extracted
- **Settings tutorial**: 28 frames extracted
- **Team interview**: 66 frames extracted
- **Total**: **173 frames** showing different UI states

### Frame Extraction Rates

| Video                 | Actual Frames | FPS Rate | Interval        |
| --------------------- | ------------- | -------- | --------------- |
| main-demo.mp4         | 79            | 0.5      | Every 2 seconds |
| settings-tutorial.mp4 | 28            | 0.33     | Every 3 seconds |
| team-interview.mp4    | 66            | 0.2      | Every 5 seconds |

### Customization

Edit `scripts/extract-video-frames.sh` to change extraction rates:

```bash
# Extract more frames (1 per second instead of 1 per 2 seconds)
extract_frames "docs/visual-references/videos/main-demo.mp4" "main-demo" 1.0
```

---

## Approach 4: Social Media & Additional Sources

### LinkedIn

Visit [Athena Intelligence LinkedIn](https://www.linkedin.com/company/athena-intelligence-ai) for:

- Product announcements with screenshots
- Demo videos and feature highlights
- Use case examples

### Twitter/X

Check [@athenaintel](https://twitter.com/athenaintel) for:

- Product updates with visuals
- Demo GIFs and short clips

### Product Hunt

- [Athena Intelligence on Product Hunt](https://www.producthunt.com/products/athena-intelligence)
- May contain launch screenshots and demos (requires visiting page directly)

### Tech Blogs & Case Studies

Already captured:

- ✅ LangChain case study images
- ✅ E2B blog screenshots
- ✅ DataStax interface screenshot
- ✅ Zep architecture diagrams

---

## Complete Visual Asset Inventory

After running all automation scripts, you have:

| Source                     | Count          | Size        | Type                                |
| -------------------------- | -------------- | ----------- | ----------------------------------- |
| **YouTube demo videos**    | 3              | 145 MB      | MP4 format (converted from MPEG-TS) |
| **Playwright screenshots** | 39             | ~5.6 MB     | Full pages + components             |
| **Extracted video frames** | 173            | ~164 MB     | PNG frames (1920px wide)            |
| **Total**                  | **215 assets** | **~315 MB** | Mixed formats                       |

**Note**: The CDN authentication signature challenge was successfully bypassed using Playwright browser automation, eliminating the need for direct downloads of protected assets.

---

## Recommended Workflow

### For New Feature Development:

1. **Start with video review**:

   ```bash
   open docs/visual-references/videos/main-demo.mp4
   ```

2. **Extract frames from relevant timestamp**:

   ```bash
   # Extract single frame at 30 seconds
   ffmpeg -i docs/visual-references/videos/main-demo.mp4 \
     -ss 00:00:30 -frames:v 1 \
     docs/visual-references/frames/feature-specific.png
   ```

3. **Check Playwright screenshots**:

   ```bash
   open docs/visual-references/automated/chat-application-full.png
   ```

4. **Review documentation**:
   - See [VISUAL_REFERENCES.md](./VISUAL_REFERENCES.md) for full catalog
   - Check feature-specific sections

---

## Troubleshooting

### Playwright Script Fails

**Error**: "Cannot find module 'playwright'"

```bash
npm install playwright
npx playwright install
```

**Error**: "Timeout waiting for page"

- Increase `timeout` value in `scripts/capture-screenshots.js`
- Check internet connection
- Try specific page manually

### Frame Extraction Issues

**Error**: "ffmpeg: command not found"

```bash
brew install ffmpeg
```

**Error**: "No such file or directory"

- Ensure videos are downloaded first
- Check paths in script match actual file locations

### YouTube Download Issues

**Error**: "HTTP Error 403: Forbidden"

- Update yt-dlp: `brew upgrade yt-dlp`
- Try different format: `yt-dlp -f "best[height<=720]"`

---

## Next Steps

1. **Run all automation** to gather maximum visual references
2. **Review and organize** screenshots by feature area
3. **Extract design tokens** (colors, spacing, typography) from screenshots
4. **Document UI patterns** for component development
5. **Create Figma designs** (optional) based on screenshots

See [LINEAR ISSUE LOG-159](https://linear.app/logarithmic/issue/LOG-159) for UI/UX analysis task.

---

## Maintenance

### Keeping References Updated

When Athena Intelligence updates their docs:

```bash
# Re-capture screenshots
node scripts/capture-screenshots.js

# Download latest demo videos (if changed)
yt-dlp https://youtube.com/watch?v=[NEW_VIDEO_ID] \
  -o docs/visual-references/videos/new-demo.mp4

# Extract new frames
./scripts/extract-video-frames.sh
```

### Adding New Pages

Edit `scripts/capture-screenshots.js`:

```javascript
const PAGES = [
  // ... existing pages
  {
    url: 'https://resources.athenaintel.com/docs/NEW_PAGE',
    name: 'new-feature',
    waitFor: 2000,
  },
];
```

---

## Summary

This automated approach successfully bypasses the CDN authentication challenge and provides **215 visual references** for MVP development. Combined with the comprehensive documentation in [VISUAL_REFERENCES.md](./VISUAL_REFERENCES.md), you now have everything needed for accurate feature implementation.

**Automation Results:**

- **Total capture time**: ~10-15 minutes (including ffmpeg install and video conversion)
- **Total assets**: 215 (3 videos + 39 screenshots + 173 frames)
- **Total size**: ~315 MB of visual references
- **Success rate**: 100% - all targeted documentation pages captured
