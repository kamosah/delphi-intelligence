/**
 * Automated Screenshot Capture Script
 *
 * Uses Playwright to visit Athena Intelligence documentation pages
 * and capture screenshots, bypassing the CDN signature requirement.
 *
 * Usage:
 *   npm install playwright
 *   node scripts/capture-screenshots.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Documentation pages to screenshot
const PAGES = [
  {
    url: 'https://resources.athenaintel.com/docs/applications/chat',
    name: 'chat-application',
    waitFor: 2000, // Wait for images to load
  },
  {
    url: 'https://resources.athenaintel.com/docs/applications/notebooks',
    name: 'notebooks-application',
    waitFor: 2000,
  },
  {
    url: 'https://resources.athenaintel.com/docs/contextual-knowledge/workbench',
    name: 'workbench',
    waitFor: 2000,
  },
  {
    url: 'https://resources.athenaintel.com/docs/getting-started/using-athena',
    name: 'getting-started',
    waitFor: 2000,
  },
  {
    url: 'https://resources.athenaintel.com/docs/getting-started/working-with-olympus',
    name: 'working-with-olympus',
    waitFor: 2000,
  },
  {
    url: 'https://resources.athenaintel.com/docs/applications/voice',
    name: 'voice-features',
    waitFor: 2000,
  },
  {
    url: 'https://resources.athenaintel.com/docs/getting-started/olympus',
    name: 'olympus-platform',
    waitFor: 2000,
  },
  {
    url: 'https://resources.athenaintel.com/docs/getting-started/athena',
    name: 'athena-agent',
    waitFor: 2000,
  },
];

// Output directory
const OUTPUT_DIR = path.join(__dirname, '../docs/visual-references/automated');

async function captureScreenshots() {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('Starting automated screenshot capture...\n');

  // Launch browser
  const browser = await chromium.launch({
    headless: true, // Set to false to see the browser in action
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  });

  const page = await context.newPage();

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

      // Wait for at least one mintcdn image to load (or timeout)
      await page
        .waitForSelector('img[src*="mintcdn.com"]', {
          timeout: pageConfig.waitFor,
        })
        .catch(() => {
          // Ignore timeout errors - page may not have mintcdn images
          console.log(
            `   ⚠️  No mintcdn images found within ${pageConfig.waitFor}ms, continuing...`
          );
        });

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

      // Optional: Capture individual images on the page
      const images = await page.locator('img[src*="mintcdn.com"]').all();
      if (images.length > 0) {
        console.log(`   Found ${images.length} mintcdn images on page`);

        for (let i = 0; i < Math.min(images.length, 10); i++) {
          try {
            const imagePath = path.join(
              OUTPUT_DIR,
              `${pageConfig.name}-image-${i + 1}.png`
            );
            await images[i].screenshot({ path: imagePath });
            console.log(`   📷 Saved image ${i + 1}: ${imagePath}`);
          } catch (err) {
            console.log(
              `   ⚠️  Could not capture image ${i + 1}: ${err.message}`
            );
          }
        }
        console.log('');
      }
    } catch (error) {
      console.error(
        `   ❌ Error capturing ${pageConfig.name}: ${error.message}\n`
      );
    }
  }

  // Close browser
  await browser.close();

  console.log('✅ Screenshot capture complete!');
  console.log(`📁 Screenshots saved to: ${OUTPUT_DIR}`);
}

// Run the script
captureScreenshots().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
