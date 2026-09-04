import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypePreserveCodeLanguage from './src/utils/rehypePreserveCodeLanguage';

// math (KaTeX) + GitHub-flavored markdown. Syntax highlighting is handled
// by the React `CodeBlock` component (prism-react-renderer), not Shiki.
const markdownProcessor = unified({
  remarkPlugins: [remarkMath, remarkGfm],
  rehypePlugins: [
    [rehypeKatex, { strict: 'ignore', throwOnError: false }],
    rehypePreserveCodeLanguage,
  ],
});

export default defineConfig({
  site: 'https://www.sctheblog.com', // Also in robots.txt!
  trailingSlash: 'always',
  output: 'static',
  publicDir: 'static', // dir with static resources
  server: {
    host: true,
    port: 8080,
  },
  markdown: {
    syntaxHighlight: false,
    processor: markdownProcessor,
  },
  integrations: [
    react(),
    mdx({
      // `.mdx` extends `markdown` config by default, but be explicit so that
      // math + GFM are guaranteed for both `.mdx` files.
      processor: markdownProcessor,
    }),
    sitemap({}),
    vercel(),
  ],
});
