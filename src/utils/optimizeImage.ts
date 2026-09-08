import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

/** Everything a `<BlogImage>`/`<ImageRaw>` needs to render an optimized image. */
export interface ImageRecord {
  src: string;
  srcSet: string;
  /** Tiny/low-quality image used as the blurred placeholder. */
  placeholder: string;
  width: number;
  height: number;
}

const RESIZE_WIDTHS = [900, 1366, 1920];

const OPTIMIZABLE_EXT_RE = /\.(png|jpe?g|webp|avif|tiff)$/i;

function canOptimizeImage(url: string): boolean {
  const clean = url.split('?')[0];
  return OPTIMIZABLE_EXT_RE.test(clean);
}

/** Process an image with Astro's sharp pipeline + generate a blurred thumb. */
async function processImage(meta: ImageMetadata): Promise<ImageRecord> {
  // remove transparency. Since we assume the image might contain black text, we set it to something light even though it's unfortunate in dark theme.
  const background = '#fafafa'; // same as var(--background-content)

  const hi = await getImage({
    src: meta,
    // NOTE: omit `format` entirely — Astro's sharp service chokes on
    // `format: 'auto'` during the prerender phase, and preserving the source
    // format is the safer default anyway.
    quality: 90,
    widths: RESIZE_WIDTHS,
    sizes: '100vw',
    background,
  });
  const lo = await getImage({
    src: meta,
    format: 'webp',
    width: 32,
    quality: 60,
    background,
  });
  return {
    src: hi.src,
    srcSet: hi.srcSet.attribute || hi.src,
    placeholder: lo.src,
    width: meta.width,
    height: meta.height,
  };
}

/** GIF/SVG (and other unprocessable formats) are emitted as-is. */
function skipProcessingImage(meta: ImageMetadata): ImageRecord {
  return {
    src: meta.src,
    srcSet: meta.src,
    placeholder: meta.src,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
  };
}

export async function optimizeImage(src: string, meta: ImageMetadata) {
  return canOptimizeImage(src)
    ? await processImage(meta)
    : skipProcessingImage(meta);
}
