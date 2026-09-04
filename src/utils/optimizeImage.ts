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

// TODO no need for so many widths
const RESIZE_WIDTHS = [400, 750, 1080, 1366, 1920];

const OPTIMIZABLE_EXT_RE = /\.(png|jpe?g|webp|avif|tiff)$/i;

function canOptimizeImage(url: string): boolean {
  const clean = url.split('?')[0];
  return OPTIMIZABLE_EXT_RE.test(clean);
}

/** Process an image with Astro's sharp pipeline + generate a blurred thumb. */
async function processImage(meta: ImageMetadata): Promise<ImageRecord> {
  const hi = await getImage({
    src: meta,
    // NOTE: omit `format` entirely — Astro's sharp service chokes on
    // `format: 'auto'` during the prerender phase, and preserving the source
    // format is the safer default anyway.
    quality: 90,
    widths: RESIZE_WIDTHS,
    sizes: '100vw',
  });
  const lo = await getImage({
    src: meta,
    format: 'webp',
    width: 32,
    quality: 60,
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
