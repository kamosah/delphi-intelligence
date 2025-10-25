/**
 * Hex Visual Asset Capture Script (TypeScript)
 *
 * Captures screenshots from Hex.tech website for design research
 * Run: npm run capture:hex
 *
 * Requirements: npm install (from docs/ directory)
 */

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from 'playwright';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const OUTPUT_DIR = __dirname;
const VIEWPORT = { width: 1920, height: 1080 };
const MOBILE_VIEWPORT = { width: 375, height: 812 };

// Types
interface CaptureConfig {
  selector: string;
  name: string;
  fullPage?: boolean;
}

interface PageConfig {
  url: string;
  name: string;
  description: string;
  captures: CaptureConfig[];
}

interface PageMetadata {
  url: string;
  description: string;
  capturedAt: string;
  viewport: { width: number; height: number };
  title: string;
}

// Pages to capture
const PAGES: PageConfig[] = [
  // Homepage
  {
    url: 'https://hex.tech',
    name: 'homepage',
    description: 'Hex homepage with hero, features, testimonials',
    captures: [
      { selector: 'body', name: 'full-page', fullPage: true },
      { selector: 'header', name: 'header' },
    ],
  },

  // Product Pages
  {
    url: 'https://hex.tech/product/notebooks/',
    name: 'product-notebooks',
    description: 'Notebooks product page',
    captures: [{ selector: 'body', name: 'full-page', fullPage: true }],
  },
  {
    url: 'https://hex.tech/product/magic-ai/',
    name: 'product-magic-ai',
    description: 'Magic AI / Agent features page',
    captures: [{ selector: 'body', name: 'full-page', fullPage: true }],
  },
  {
    url: 'https://hex.tech/product/threads/',
    name: 'product-threads',
    description: 'Threads conversational analytics page',
    captures: [{ selector: 'body', name: 'full-page', fullPage: true }],
  },
  {
    url: 'https://hex.tech/enterprise/',
    name: 'product-enterprise',
    description: 'Enterprise features and governance',
    captures: [{ selector: 'body', name: 'full-page', fullPage: true }],
  },

  // Blog Posts - Just capture full page since article selector varies
  {
    url: 'https://hex.tech/blog/introducing-threads/',
    name: 'blog-threads',
    description: 'Threads announcement blog post',
    captures: [{ selector: 'body', name: 'full-page', fullPage: true }],
  },
  {
    url: 'https://hex.tech/blog/introducing-notebook-agent/',
    name: 'blog-notebook-agent',
    description: 'Notebook Agent announcement',
    captures: [{ selector: 'body', name: 'full-page', fullPage: true }],
  },
  {
    url: 'https://hex.tech/blog/notebook-agent-prompting-guide-agentic-analytics/',
    name: 'blog-prompting-guide',
    description: 'Prompting guide with examples',
    captures: [{ selector: 'body', name: 'full-page', fullPage: true }],
  },
  {
    url: 'https://hex.tech/blog/introducing-semantic-authoring/',
    name: 'blog-semantic-authoring',
    description: 'Semantic Authoring / Modeling Agent announcement',
    captures: [{ selector: 'body', name: 'full-page', fullPage: true }],
  },
  {
    url: 'https://hex.tech/blog/fall-2025-launch/',
    name: 'blog-fall-2025-launch',
    description: 'Fall 2025 AI agents launch announcement',
    captures: [{ selector: 'body', name: 'full-page', fullPage: true }],
  },

  // Documentation
  {
    url: 'https://learn.hex.tech/docs/getting-started/ai-overview',
    name: 'docs-ai-overview',
    description: 'AI features documentation overview',
    captures: [{ selector: 'main', name: 'content', fullPage: true }],
  },
  {
    url: 'https://learn.hex.tech/docs/explore-data/notebook-view/notebook-agent',
    name: 'docs-notebook-agent',
    description: 'Notebook Agent documentation',
    captures: [{ selector: 'main', name: 'content', fullPage: true }],
  },
];

/**
 * Main execution function
 */
async function main(): Promise<void> {
  console.log('🚀 Starting Hex visual asset capture...\n');

  // Launch browser
  const browser: Browser = await chromium.launch({
    headless: true, // Set to false to watch captures
  });

  const context: BrowserContext = await browser.newContext({
    viewport: VIEWPORT,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  });

  const page: Page = await context.newPage();

  // Process each page
  for (const pageConfig of PAGES) {
    await capturePage(page, pageConfig);
  }

  // Capture mobile versions of key pages
  console.log('\n📱 Capturing mobile versions...\n');
  await page.setViewportSize(MOBILE_VIEWPORT);

  const mobilePages = [
    PAGES[0], // Homepage
    PAGES[3], // Threads
  ];

  for (const pageConfig of mobilePages) {
    await capturePage(page, {
      ...pageConfig,
      name: `${pageConfig.name}-mobile`,
    });
  }

  await browser.close();

  console.log('\n✅ All screenshots captured successfully!');
  console.log(`📂 Output directory: ${OUTPUT_DIR}\n`);
}

/**
 * Capture screenshots for a single page
 */
async function capturePage(page: Page, config: PageConfig): Promise<void> {
  const { url, name, description, captures } = config;

  console.log(`📸 Capturing: ${description}`);
  console.log(`   URL: ${url}`);

  try {
    // Navigate to page with increased timeout for slower blog pages
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 60000, // Increased from 30s to 60s
    });

    // Wait for dynamic content to load
    await page.waitForTimeout(2000);

    // Create output directory for this page
    const pageDir = join(OUTPUT_DIR, name);
    await mkdir(pageDir, { recursive: true });

    // Capture each specified element/view
    for (const capture of captures) {
      const { selector, name: captureName, fullPage = false } = capture;

      try {
        if (selector === 'body') {
          // Full page screenshot
          const filename = join(pageDir, `${captureName}.png`);
          await page.screenshot({
            path: filename,
            fullPage: fullPage,
          });
          console.log(`   ✓ Saved: ${captureName}.png`);
        } else {
          // Element-specific screenshot
          const element = await page.$(selector);
          if (element) {
            const filename = join(pageDir, `${captureName}.png`);
            await element.screenshot({ path: filename });
            console.log(`   ✓ Saved: ${captureName}.png`);
          } else {
            console.log(`   ⚠ Element not found: ${selector}`);
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.log(`   ✗ Error capturing ${captureName}: ${errorMessage}`);
      }
    }

    // Also save page metadata
    const metadata: PageMetadata = {
      url,
      description,
      capturedAt: new Date().toISOString(),
      viewport: page.viewportSize() || VIEWPORT,
      title: await page.title(),
    };

    await writeFile(
      join(pageDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    console.log(`   ✓ Saved metadata\n`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`   ✗ Error loading page: ${errorMessage}\n`);
  }
}

/**
 * Extract and save embedded images from page
 */
async function extractImages(
  page: Page,
  outputDir: string
): Promise<ImageInfo[]> {
  const images = await page.$$eval('img', (imgs) =>
    imgs.map((img) => ({
      src: img.src,
      alt: img.alt,
      width: img.width,
      height: img.height,
    }))
  );

  // Filter for relevant images (avoid icons, logos)
  const relevantImages = images.filter(
    (img) => img.width > 300 && img.height > 200
  );

  return relevantImages;
}

interface ImageInfo {
  src: string;
  alt: string;
  width: number;
  height: number;
}

// Run the script
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

/**
 * USAGE INSTRUCTIONS
 *
 * 1. Install dependencies (from docs/ directory):
 *    npm install
 *
 * 2. Run script:
 *    npm run capture:hex
 *
 * 3. Output structure:
 *    screenshots/
 *      homepage/
 *        full-page.png
 *        header.png
 *        hero-section.png
 *        metadata.json
 *      product-threads/
 *        full-page.png
 *        metadata.json
 *      ...
 *
 * 4. Optional: Modify PAGES array to add more URLs or selectors
 *
 * 5. For headless mode: Set headless: false in browser.launch()
 *    to watch the capture process
 */
