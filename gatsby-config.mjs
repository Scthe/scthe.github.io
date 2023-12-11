import { dirname } from 'path';
import { fileURLToPath } from 'url';

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
    `gatsby-plugin-image`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/content/blog`,
        // path: `${__dirname}/content/blog/*/*.*`,
        ignore: [`**/\\.*`], // ignore if starts with dot /**/*
        name: `pages`,
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
          formats: [`jpg`],
          placeholder: `blurred`,
          quality: 70,
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
        // https://www.gatsbyjs.com/plugins/gatsby-plugin-mdx/#updating-dependencies
        // TODO math + syntax highlight
        // remarkPlugins: [require('remark-math')],
        mdxOptions: {
          remarkPlugins: [],
          rehypePlugins: [],
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
    {
      resolve: `gatsby-transformer-remark`,
      options: {
        plugins: [
          {
            resolve: `gatsby-remark-katex`,
            options: {
              // Add any KaTeX options from https://github.com/KaTeX/KaTeX/blob/master/docs/options.md here
              strict: `ignore`,
            },
          },
        ],
      },
    },
  ],
};

export default config;
