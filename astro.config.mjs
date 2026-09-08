import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { getSiteMeta } from './src/constants';

// math (KaTeX) + GitHub-flavored markdown. Syntax highlighting is handled by
// `@astrojs/prism` (`syntaxHighlight: 'prism'`) at build time.
const markdownProcessor = unified({
  remarkPlugins: [remarkMath, remarkGfm],
  rehypePlugins: [[rehypeKatex, { strict: 'ignore', throwOnError: false }]],
});

const SITE_STATIC = getSiteMeta();

export default defineConfig({
  site: SITE_STATIC.siteUrl,
  trailingSlash: 'always',
  output: 'static',
  publicDir: 'static', // dir with static resources
  server: {
    host: true,
    port: 8080,
  },
  markdown: {
    syntaxHighlight: 'prism',
    processor: markdownProcessor,
  },
  build: {
    // inline all CSS into <style> tags in <head>; emit no separate .css files
    inlineStylesheets: 'always',
  },
  integrations: [
    react(),
    mdx({
      // `.mdx` extends `markdown` config by default, but be explicit so that
      // math + GFM are guaranteed for both `.mdx` files.
      processor: markdownProcessor,
    }),
    sitemap({
      lastmod: new Date(),
    }),
    vercel({
      webAnalytics: { enabled: false },
      imageService: false,
    }),
  ],
});
