# Athena Documentation & Research

This directory contains comprehensive documentation, design research, and automation scripts for the Athena Intelligence platform.

## Directory Structure

```
docs/
├── package.json          # TypeScript and tooling dependencies
├── tsconfig.json         # TypeScript configuration
├── node_modules/         # Installed dependencies
│
└── design-research/
    └── hex/              # Hex design research (complete)
        ├── README.md
        ├── RESEARCH_COMPLETE.md
        ├── design-system/
        ├── product-architecture/
        ├── philosophy/
        └── visual-assets/
```

## Quick Start

### Install Dependencies

```bash
cd docs
npm install
```

**Installs:**

- TypeScript (5.3+)
- Playwright (browser automation)
- tsx (TypeScript execution runtime)
- @types/node (Node.js type definitions)

### Available Scripts

```bash
# Capture Hex screenshots (design research)
npm run capture:hex

# Type-check all TypeScript files
npm run type-check
```

---

## Design Research

### Hex Research (✅ Complete)

Comprehensive research on Hex.tech's AI-native data platform.

**Location:** `design-research/hex/`

**Contents:**

- 📄 12 documentation files (4,250+ lines)
- 🎨 Design system tokens (colors, typography, components)
- 🤖 AI UX patterns (@ mentions, diff views, step-by-step reasoning)
- 📝 25+ prompt templates
- 📸 30MB visual assets (screenshots)

**Start here:** [`design-research/hex/README.md`](./design-research/hex/README.md)

---

## TypeScript Configuration

### tsconfig.json

Configured for:

- ✅ **ES2022** target (modern JavaScript)
- ✅ **ESNext** modules (import/export)
- ✅ **Strict mode** (maximum type safety)
- ✅ **Node.js types** included
- ✅ **No emit** (type-checking only, tsx handles execution)

### Project Structure

All TypeScript files in `design-research/**/*.ts` are included in type checking.

---

## Scripts

### `npm run capture:hex`

**Purpose:** Capture screenshots from Hex.tech for design research

**Implementation:** TypeScript script using Playwright

**File:** `design-research/hex/visual-assets/screenshots/capture-hex-visuals.ts`

**Features:**

- ✅ Type-safe configuration
- ✅ Automated browser testing
- ✅ Full-page and element screenshots
- ✅ Metadata tracking (URLs, timestamps, viewports)
- ✅ Desktop + mobile captures
- ✅ Error handling and retries

**Output:** `design-research/hex/visual-assets/screenshots/[page-name]/`

**Usage:**

```bash
npm run capture:hex
```

---

### `npm run type-check`

**Purpose:** Verify TypeScript types across all scripts

**Command:** `tsc --noEmit`

**Checks:**

- ✅ Type correctness
- ✅ Import/export validity
- ✅ Function signatures
- ✅ Variable types

**Usage:**

```bash
npm run type-check
```

---

## Dependencies

### Development Dependencies

| Package         | Version  | Purpose                            |
| --------------- | -------- | ---------------------------------- |
| **typescript**  | ^5.3.3   | TypeScript compiler                |
| **tsx**         | ^4.7.0   | TypeScript execution runtime       |
| **playwright**  | ^1.40.0  | Browser automation for screenshots |
| **@types/node** | ^20.10.0 | Node.js type definitions           |

### Why tsx?

- ⚡ **Fast:** No compilation step, runs TypeScript directly
- 🔧 **Zero config:** Works out of the box with ES modules
- 🎯 **Type-safe:** Full TypeScript support
- 📦 **Lightweight:** No additional build tools needed

### Why Playwright?

- 🌐 **Cross-browser:** Chromium, Firefox, WebKit support
- 🤖 **Automation:** Full browser control via API
- 📸 **Screenshots:** High-quality captures with element selection
- 🔒 **Reliable:** Built by Microsoft, battle-tested

---

## Adding New Research

### 1. Create Directory Structure

```bash
mkdir -p design-research/[company-name]/visual-assets/screenshots
```

### 2. Add TypeScript Script

Create a capture script similar to `hex/visual-assets/screenshots/capture-hex-visuals.ts`

**Template:**

```typescript
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// Your capture logic here
```

### 3. Add npm Script

Edit `package.json`:

```json
{
  "scripts": {
    "capture:company": "tsx design-research/company/visual-assets/screenshots/capture.ts"
  }
}
```

### 4. Run Type Check

```bash
npm run type-check
```

---

## Best Practices

### TypeScript Scripts

1. ✅ **Use strict mode** - Catch errors early
2. ✅ **Define interfaces** - Document data structures
3. ✅ **Handle errors** - Try/catch with typed errors
4. ✅ **Export types** - Share types across scripts
5. ✅ **Comment code** - Explain complex logic

### Screenshot Capture

1. ✅ **Save metadata** - Track URLs, dates, viewports
2. ✅ **Organize by page** - Separate directories per page
3. ✅ **Use descriptive names** - `full-page.png`, `header.png`
4. ✅ **Handle timeouts** - Some pages load slowly
5. ✅ **Retry on failure** - Network issues happen

### Documentation

1. ✅ **Markdown files** - Easy to read and maintain
2. ✅ **Cross-reference** - Link between related docs
3. ✅ **Update dates** - Track when research was done
4. ✅ **Source URLs** - Always cite original sources
5. ✅ **Completion notes** - Document what's done vs pending

---

## Maintenance

### Update Dependencies

```bash
cd docs
npm update
npm audit fix
```

### Re-run Research

Design systems evolve. Re-capture screenshots periodically:

```bash
npm run capture:hex  # Re-run Hex research
```

**Recommended:** Quarterly updates for active design systems

### Type Check Before Commit

```bash
npm run type-check
```

Add to pre-commit hook if desired.

---

## Troubleshooting

### "Module not found" Errors

**Solution:** Install dependencies

```bash
npm install
```

### TypeScript Compilation Errors

**Solution:** Check `tsconfig.json` and fix type errors

```bash
npm run type-check
```

### Playwright Timeout Errors

**Solution:** Increase timeout in capture script

```typescript
await page.goto(url, {
  waitUntil: 'networkidle',
  timeout: 60000, // Increase to 60s
});
```

### Screenshot Quality Issues

**Solution:** Adjust viewport size

```typescript
const VIEWPORT = { width: 2560, height: 1440 }; // Retina display
```

---

## Contributing

### Adding Research

1. Create new directory under `design-research/`
2. Follow Hex research structure as template
3. Add TypeScript automation scripts
4. Update this README with new scripts
5. Run type-check before committing

### Improving Scripts

1. Edit TypeScript files
2. Run type-check to verify
3. Test execution with tsx
4. Update documentation
5. Commit changes

---

## Resources

### Documentation

- [Hex Research](./design-research/hex/README.md) - Complete Hex design research
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Playwright Docs](https://playwright.dev/docs/intro)
- [tsx Documentation](https://tsx.is/)

### Tools

- **TypeScript:** https://www.typescriptlang.org/
- **Playwright:** https://playwright.dev/
- **tsx:** https://tsx.is/

---

**Last Updated:** October 24, 2025
**Status:** ✅ TypeScript migration complete
