# Hex Screenshots - Automated Capture

This directory contains screenshots captured from Hex.tech for design research purposes.

## Quick Start

### Install Dependencies

**From the docs root directory:**

```bash
cd docs
npm install
```

This installs:

- TypeScript
- Playwright (browser automation)
- tsx (TypeScript execution)
- Type definitions

### Run Screenshot Capture

**From the docs root directory:**

```bash
npm run capture:hex
```

Or run directly with tsx:

```bash
npx tsx design-research/hex/visual-assets/screenshots/capture-hex-visuals.ts
```

The script will:

1. Launch a headless browser
2. Visit each configured Hex page
3. Capture full-page and element-specific screenshots
4. Save images organized by page name
5. Generate metadata.json for each page

### Output Structure

```
screenshots/
├── homepage/
│   ├── full-page.png
│   ├── header.png
│   ├── hero-section.png
│   └── metadata.json
├── product-notebooks/
│   ├── full-page.png
│   └── metadata.json
├── product-threads/
│   ├── full-page.png
│   └── metadata.json
├── blog-threads/
│   ├── article-content.png
│   └── metadata.json
└── ...
```

---

## What Gets Captured

### Product Pages

- Homepage (desktop + mobile)
- Product/Notebooks page
- Product/Magic AI page
- Product/Threads page
- Enterprise page

### Blog Posts

- Threads announcement
- Notebook Agent announcement
- Prompting guide
- Semantic Authoring announcement
- Fall 2025 launch

### Documentation

- AI Overview
- Notebook Agent docs

---

## Customization

### Add More Pages

Edit `capture-hex-visuals.ts` and add to the `PAGES` array:

```javascript
{
  url: 'https://hex.tech/your-page',
  name: 'your-page-name',
  description: 'Description for logging',
  captures: [
    { selector: 'body', name: 'full-page', fullPage: true },
    { selector: '.specific-element', name: 'element-name' },
  ],
},
```

### Change Viewport

Modify viewport settings in script:

```javascript
const VIEWPORT = { width: 1920, height: 1080 }; // Desktop
const MOBILE_VIEWPORT = { width: 375, height: 812 }; // Mobile
```

### Capture Specific Elements

Add selectors to `captures` array:

```typescript
captures: [
  { selector: '.hero-section', name: 'hero' },
  { selector: '#pricing-table', name: 'pricing' },
  { selector: 'article img', name: 'article-images' },
],
```

### Type Safety

The TypeScript version provides:

- ✅ Type-safe configuration
- ✅ IntelliSense for Playwright API
- ✅ Compile-time error checking
- ✅ Better IDE support

---

## Troubleshooting

### Script Hangs

- Increase timeout in `page.goto()` options
- Check if page requires authentication
- Set `headless: false` to watch browser

### Element Not Found

- Check selector with browser DevTools
- Wait for dynamic content: `await page.waitForSelector(selector)`
- Verify page structure hasn't changed

### Network Errors

- Check internet connection
- Verify URLs are accessible
- Some pages may block automated browsers (check robots.txt)

---

## Manual Screenshot Tips

If automated capture fails for specific pages:

1. **Open browser in developer mode:**
   - DevTools → Cmd+Shift+P → "Capture full size screenshot"

2. **Browser extensions:**
   - Awesome Screenshot (Chrome/Firefox)
   - Full Page Screen Capture (Chrome)

3. **Save to:** `screenshots/[page-name]/manual-[element].png`

---

## Metadata Format

Each captured page includes `metadata.json`:

```json
{
  "url": "https://hex.tech/...",
  "description": "Page description",
  "capturedAt": "2025-01-XX",
  "viewport": { "width": 1920, "height": 1080 },
  "title": "Page Title | Hex"
}
```

Use this to track when screenshots were taken and may need updates.

---

## Best Practices

1. **Re-run periodically** - Hex updates UI frequently
2. **Document changes** - Note major design updates in commit messages
3. **Compress images** - Use tools like ImageOptim for smaller file sizes
4. **Annotate** - Add arrows/highlights in separate files (don't modify originals)

---

## Related Documentation

- [Video Demo Links](../videos/demo-links.md) - Non-screenshot visual resources
- [AI Components](../../design-system/ai-components.md) - UI patterns to look for
- [Design System Colors](../../design-system/colors.md) - Extract colors from screenshots

---

**Last Updated:** January 2025
**License:** Screenshots for internal design research only (respect Hex's copyright)
