import type { ImageMetadata } from 'astro';
import { getCollection } from 'astro:content';

import {
  buildImageRecord,
  buildPassThroughRecord,
  canOptimizeImage,
  type ImageRecord,
} from '../../utils/images';

// All post images, resolved relative to this file:
//   src/blogPost/components/../../../content/blog/**  ->  repo/content/blog/**
const imageModules = import.meta.glob<ImageMetadata>(
  '../../../content/blog/**/*.{png,jpg,jpeg,gif,webp,avif,svg,tiff}',
  { eager: true, import: 'default' },
);

const normalizeSrc = (src: string): string =>
  src.trim().replace(/^\.\//, '').replace(/^\//, '');

type Index = {
  dirByPermalink: Map<string, string>;
  // permalink -> (normalized src -> record)
  recordsByPermalink: Map<string, Map<string, ImageRecord | null>>;
};

let index: Index | null = null;

async function getIndex(): Promise<Index> {
  if (index) {
    return index;
  }

  const posts = await getCollection('blog');
  const dirByPermalink = new Map<string, string>();
  for (const post of posts) {
    const parts = (post.filePath ?? post.id).split(/[\\/]/).filter(Boolean);
    dirByPermalink.set(post.data.permalink, parts.slice(-2, -1)[0] ?? '');
  }

  index = { dirByPermalink, recordsByPermalink: new Map() };
  return index;
}

/**
 * Memoized map of `src -> ImageRecord` for a single post (keyed by its
 * permalink). Used both by the page (raw `<img>` overrides) and by the
 * `imageIsland` React island (zoomable `<BlogImage>`).
 */
export async function getPostImageRecords(
  permalink: string,
): Promise<Map<string, ImageRecord | null>> {
  const { recordsByPermalink } = await getIndex();
  const cached = recordsByPermalink.get(permalink);
  if (cached) {
    return cached;
  }

  const { dirByPermalink } = await getIndex();
  const dir = dirByPermalink.get(permalink);
  const records = new Map<string, ImageRecord | null>();

  if (dir != null) {
    const prefix = `../../../content/blog/${dir}/`;
    for (const [moduleKey, meta] of Object.entries(imageModules)) {
      if (moduleKey.startsWith(prefix)) {
        const normSrc = normalizeSrc(moduleKey.slice(prefix.length));
        records.set(
          normSrc,
          canOptimizeImage(normSrc)
            ? await buildImageRecord(meta)
            : buildPassThroughRecord(meta),
        );
      }
    }
  }

  recordsByPermalink.set(permalink, records);
  return records;
}

/** Resolve a single image (used so `BlogImage` can render a fallback). */
export async function resolvePostImage(
  permalink: string,
  src: string,
): Promise<ImageRecord | null> {
  const records = await getPostImageRecords(permalink);
  return records.get(normalizeSrc(src)) ?? null;
}
