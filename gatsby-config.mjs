import { dirname } from 'path';
import { fileURLToPath } from 'url';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = {
  siteMetadata: {
    title: `Scthe's blog`,
    description: `Mostly some programming stuff`,
    siteUrl: `https://www.sctheblog.com`, // Also in robots.txt!
    defaultImage: 'default_opengraph_image.jpg',
    author: {
      name: `Marcin Matuszczyk`,
      username: `Scthe`,
      githubAccount: 'https://github.com/Scthe',
    },
  },
  plugins: [
    `gatsby-plugin-react-helmet`,
    `gatsby-plugin-sass`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/content/blog`,
        ignore: [`**/\\.*`], // ignore if starts with dot /**/*
        name: `blog`,
      },
    },
    // add static images folder:
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/static/images`,
        name: `static_images`,
      },
    },
    // sharp: optimize images
    `gatsby-transformer-sharp`,
    {
      resolve: `gatsby-plugin-sharp`,
      options: {
        defaults: {
          // https://www.gatsbyjs.com/docs/reference/built-in-components/gatsby-plugin-image/
          formats: ['auto'],
          placeholder: `blurred`,
          quality: 90,
          // breakpoints: [750, 1080, 1366, 1920],
          // backgroundColor: `transparent`,
          // tracedSVGOptions: {},
          // blurredOptions: {},
          // jpgOptions: {},
          // pngOptions: {},
          // webpOptions: {},
          // avifOptions: {},
        },
      },
    },
    // mdx:
    {
      resolve: `gatsby-plugin-mdx`,
      options: {
        extensions: [`.md`, `.mdx`],
        mdxOptions: {
          remarkPlugins: [remarkMath, remarkGfm],
          rehypePlugins: [
            [rehypeKatex, { strict: 'ignore', throwOnError: false }],
          ],
        },
        gatsbyRemarkPlugins: [
          {
            resolve: `gatsby-remark-images`,
            options: {
              maxWidth: 870,
            },
          },
          `gatsby-remark-copy-linked-files`,
          `gatsby-remark-smartypants`,
        ],
      },
    },
    // generate typings from graphql queries:
    {
      resolve: 'gatsby-plugin-typegen',
      options: {
        outputPath: `src/__generated__/gatsby-types.d.ts`,
        emitSchema: {
          'src/__generated__/gatsby-schema.graphql': true,
        },
        emitPluginDocuments: {
          'src/__generated__/gatsby-plugin-documents.graphql': true,
        },
      },
    },
    // sitemap:
    `gatsby-plugin-advanced-sitemap`,
    // gtag:
    {
      resolve: `gatsby-plugin-google-gtag`,
      options: {
        trackingIds: ['UA-66646958-1'],
        gtagConfig: {
          anonymize_ip: true,
          cookie_expires: 0,
        },
        pluginConfig: {
          head: false,
        },
      },
    },
  ],
};

export default config;
