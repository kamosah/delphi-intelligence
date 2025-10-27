/**
 * Automated Hex Screenshot Capture Script
 *
 * Uses Playwright to visit Hex product pages and documentation
 * to capture UI/UX reference screenshots for design alignment.
 *
 * Usage:
 *   npm install playwright
 *   npx tsx scripts/capture-hex-screenshots.ts
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

interface PageConfig {
  url: string;
  name: string;
  waitFor: number;
}

// Hex product and documentation pages to screenshot
const PAGES: PageConfig[] = [
  {
    url: 'https://hex.tech',
    name: 'hex-homepage',
    waitFor: 3000,
  },
  {
    url: 'https://hex.tech/blog/introducing-threads/',
    name: 'hex-threads-announcement',
    waitFor: 3000,
  },
  {
    url: 'https://hex.tech/blog/introducing-notebook-agent/',
    name: 'hex-notebook-agent-announcement',
    waitFor: 3000,
  },
  {
    url: 'https://hex.tech/blog/fall-2025-launch/',
    name: 'hex-fall-2025-launch',
    waitFor: 3000,
  },
  {
    url: 'https://learn.hex.tech/docs',
    name: 'hex-docs-overview',
    waitFor: 3000,
  },
  {
    url: 'https://learn.hex.tech/docs/getting-started/ai-overview',
    name: 'hex-ai-overview',
    waitFor: 3000,
  },
  {
    url: 'https://learn.hex.tech/docs/explore-data/cells/sql-cells',
    name: 'hex-sql-cells',
    waitFor: 3000,
  },
  {
    url: 'https://learn.hex.tech/docs/explore-data/cells/chart-cells',
    name: 'hex-chart-cells',
    waitFor: 3000,
  },
  {
    url: 'https://learn.hex.tech/docs/connect-to-data/data-connections',
    name: 'hex-data-connections',
    waitFor: 3000,
  },
  {
    url: 'https://learn.hex.tech/docs/semantic-layer/semantic-layer',
    name: 'hex-semantic-layer',
    waitFor: 3000,
  },
];

// Output directory
const OUTPUT_DIR = path.join(
  __dirname,
  '../docs/visual-references/hex/screenshots'
);

async function captureHexScreenshots(): Promise<void> {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Starting Hex screenshot capture...\n');
  console.log('📌 Purpose: Capture Hex UI/UX patterns for design alignment\n');

  // Launch browser
  const browser: Browser = await chromium.launch({
    headless: true, // Set to false to see the browser in action
  });

  const context: BrowserContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  });

  const page: Page = await context.newPage();

  // Capture each page
  for (const pageConfig of PAGES) {
    try {
      console.log(`📸 Capturing: ${pageConfig.name}`);
      console.log(`   URL: ${pageConfig.url}`);

      // Navigate to page
      await page.goto(pageConfig.url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // Wait for page to stabilize
      await page.waitForTimeout(pageConfig.waitFor);

      // Take full page screenshot
      const screenshotPath = path.join(
        OUTPUT_DIR,
        `${pageConfig.name}-full.png`
      );
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });

      console.log(`   ✅ Saved: ${screenshotPath}\n`);

      // Try to capture key UI elements (images, interactive components)
      const images = await page.locator('img[src*="hex"]').all();
      if (images.length > 0) {
        console.log(`   Found ${images.length} Hex images on page`);

        // Capture first 5 images as component references
        for (let i = 0; i < Math.min(images.length, 5); i++) {
          try {
            const imagePath = path.join(
              OUTPUT_DIR,
              `${pageConfig.name}-component-${i + 1}.png`
            );
            await images[i].screenshot({ path: imagePath });
            console.log(`   📷 Saved component ${i + 1}: ${imagePath}`);
          } catch (err) {
            const errorMessage =
              err instanceof Error ? err.message : String(err);
            console.log(
              `   ⚠️  Could not capture component ${i + 1}: ${errorMessage}`
            );
          }
        }
        console.log('');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `   ❌ Error capturing ${pageConfig.name}: ${errorMessage}\n`
      );
    }
  }

  // Close browser
  await browser.close();

  console.log('✅ Hex screenshot capture complete!');
  console.log(`📁 Screenshots saved to: ${OUTPUT_DIR}`);
  console.log('\nNext steps:');
  console.log('1. Review screenshots for design patterns');
  console.log('2. Document key UI components in HEX_DESIGN_SYSTEM.md');
  console.log('3. Extract color palette and typography');
}

// Run the script
captureHexScreenshots().catch((error: Error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
