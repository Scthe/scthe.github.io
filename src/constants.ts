export const IS_PROD_BUILD = import.meta.env.PROD;
export const IS_DEV_BUILD = import.meta.env.DEV;

const SITE_STATIC = {
  title: `Scthe's blog`,
  description: `Mostly some programming stuff`,
  siteUrl: `https://www.sctheblog.com`, // Also in robots.txt!
  defaultImage: `/images/default_opengraph_image.jpg`,
  author: {
    name: `Marcin Matuszczyk`,
    username: `Scthe`,
    githubAccount: `https://github.com/Scthe`,
  },
} as const;

/**
 * Site metadata. In dev we point canonical/OG URLs at the dev server, same as
 * the old `useSiteMeta()` did.
 */
export function getSiteMeta() {
  if (IS_DEV_BUILD) {
    return { ...SITE_STATIC, siteUrl: `http://localhost:8080` } as const;
  }
  return SITE_STATIC;
}
