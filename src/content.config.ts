import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ base: './content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    // authoritative page path, e.g. `/blog/vulkan-init/`
    permalink: z.string(),
    excerpt: z.string(),
    date: z.coerce.date(),
    // relative path to the post's cover image, e.g. `./result_cmp.jpg`
    image: z.string().optional(),
    // `false` = published, `true` = filtered out in production
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
