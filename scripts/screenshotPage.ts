/* eslint-disable no-console */
import puppeteer from 'puppeteer-core';
import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const CHROME_EXE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export const OUTPUT_DIR = path.join(import.meta.dirname, 'screenshots');

const CONFIG = {
  prod: 'https://www.sctheblog.com/sitemap-pages.xml',
  dev: 'http://localhost:8080/sitemap-0.xml',
};

// Helper function to turn a URL into a safe filename
function urlToFilename(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    // Replace domain and special characters with dashes
    const name = url.pathname
      .replace(/[^a-z0-9]/gi, '-')
      .replace(/-+/g, '-') // Remove duplicate dashes
      .replace(/^-/g, '') // Remove prefix dash
      .replace(/-$/, ''); // Remove trailing dash

    return name || 'index';
  } catch {
    return 'invalid-url';
  }
}

// Main logic to fetch and extract URLs from sitemap
async function getUrlsFromSitemap(sitemapUrl: string): Promise<string[]> {
  console.log(`Fetching sitemap from: ${sitemapUrl}`);
  const response = await fetch(sitemapUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch sitemap: ${response.statusText}`);
  }
  const xmlData = await response.text();

  const parser = new XMLParser();
  const jsonObj = parser.parse(xmlData);

  // Check if standard urlset exists
  const urlset = jsonObj.urlset;
  if (!urlset || !urlset.url) {
    // Check if it's a sitemap index file instead
    if (jsonObj.sitemapindex) {
      throw new Error(
        'This is a sitemap index file containing other sitemaps. Please provide a direct URL list sitemap.',
      );
    }
    throw new Error('No URLs found in the provided XML structure.');
  }

  // Handle both single-URL sitemaps (object) and multi-URL sitemaps (array)
  const urlsArray = Array.isArray(urlset.url) ? urlset.url : [urlset.url];

  // Extract the string inside <loc> tags
  return urlsArray
    .map((u: any) => u.loc)
    .filter((loc: any) => typeof loc === 'string');
}

export function ensureDirExists(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureSitemapScreenshots(env: string) {
  // @ts-expect-error see check below
  const sitemapUrl = CONFIG[env];
  if (!sitemapUrl) throw new Error(`Invalid env "${env}"`);

  const outputDir = path.join(OUTPUT_DIR, env);
  ensureDirExists(outputDir);

  try {
    const urls = await getUrlsFromSitemap(sitemapUrl);
    console.log(`Found ${urls.length} URLs to process.\n`);

    // Launch the headless browser
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: CHROME_EXE,
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 720, height: 4000 });

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const filename = `${urlToFilename(url)}.png`;
      const outputPath = path.join(outputDir, filename);

      console.log(`[${i + 1}/${urls.length}] Navigating to: ${url}`);

      try {
        // networkidle0 waits until there are no network connections for at least 500ms
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

        // warning: this is actually crap, but works good enough for basic usage
        await page.screenshot({ path: outputPath });
        console.log(`Saved screenshot to: ${outputPath}\n`);
      } catch (err: any) {
        console.error(`❌ Failed to capture ${url}: ${err.message}\n`);
      }
    }

    await browser.close();
    console.log('🎉 Processing complete!');
  } catch (error) {
    console.error('Fatal execution error:', error);
  }
}

// Run the script
if (import.meta.main) {
  const env = process.argv[2]; // should be "dev" or "prod"
  captureSitemapScreenshots(env);
}
