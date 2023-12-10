module.exports = {
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
        name: `blog`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/static/images`,
        name: `static_images`,
      },
    },
    `gatsby-transformer-sharp`,
    {
      resolve: `gatsby-plugin-sharp`,
      options: {
        defaults: {
          // https://www.gatsbyjs.com/docs/reference/built-in-components/gatsby-plugin-image/
          formats: [`jpg`],
          placeholder: `blurred`,
          quality: 50,
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
    {
      resolve: `gatsby-plugin-mdx`,
      options: {
        extensions: [`.md`, `.mdx`],
        remarkPlugins: [require('remark-math')],
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
    `gatsby-plugin-advanced-sitemap`,
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
