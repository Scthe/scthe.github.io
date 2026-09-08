/* eslint-disable no-console */
import * as fs from 'fs';
import * as path from 'path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { OUTPUT_DIR as BASE_DIR, ensureDirExists } from './screenshotPage.ts';

// Define your directories
const dir1 = path.join(BASE_DIR, 'dev');
const dir2 = path.join(BASE_DIR, 'prod');
const outDir = BASE_DIR;

function listImages(dirPath: string) {
  const files = fs.readdirSync(dirPath);
  return files.filter((file) => path.extname(file).toLowerCase() === '.png');
}

type PixelmatchOpts = Parameters<typeof pixelmatch>[5];

function compareImages(fileName: string, opts: PixelmatchOpts) {
  const img1Path = path.join(dir1, fileName);
  const img2Path = path.join(dir2, fileName);

  const img1 = PNG.sync.read(fs.readFileSync(img1Path));
  const img2 = PNG.sync.read(fs.readFileSync(img2Path));

  const width = Math.min(img1.width, img2.width);
  const height = Math.min(img1.height, img2.height);
  if (img1.width !== img2.width || img1.height !== img2.height) {
    console.error(
      `❌ Error: "${fileName}" dimensions mismatch (${img1.width}x${img1.height} vs ${img2.width}x${img2.height})`,
    );
  }

  const diff = new PNG({ width, height });

  // Run pixelmatch comparison
  const numDiffPixels: number = pixelmatch(
    img1.data,
    img2.data,
    diff.data,
    width,
    height,
    opts, // { threshold: 0.1 }, // 0.1 is default; lower values are more sensitive
  );

  if (numDiffPixels > 0) {
    const diffPath: string = path.join(outDir, `diff_${fileName}`);
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
    console.log(
      `🔴 Mismatch: "${fileName}" has ${numDiffPixels} different pixels. Diff saved to: ${diffPath}`,
    );
  } else {
    console.log(`✅ Match: "${fileName}" is identical.`);
  }
}

function compareScreenshots() {
  ensureDirExists(dir1);
  ensureDirExists(dir2);
  const images1 = listImages(dir1);
  const images2 = listImages(dir2);
  const allImages = new Set([...images1, ...images2]);
  console.log(`Found ${images1.length} DEV images and ${images2.length} PROD images`); // prettier-ignore

  allImages.forEach((fileName) => {
    if (!images1.includes(fileName)) {
      console.error(`❌ Missing DEV image: '${fileName}'`);
      return;
    }
    if (!images2.includes(fileName)) {
      console.error(`❌ Missing PROD image: '${fileName}'`);
      return;
    }

    try {
      compareImages(fileName, {
        threshold: 0.1, // // 0.1 is default; lower values are more sensitive
      });
    } catch (error) {
      if (error instanceof Error) {
        console.error(`❌ Error processing "${fileName}":`, error.message);
      } else {
        console.error(`❌ Unknown error processing "${fileName}":`, error);
      }
    }
  });
}

compareScreenshots();
