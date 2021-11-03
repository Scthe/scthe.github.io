import { graphql, useStaticQuery } from 'gatsby';
import { EnsureDefined } from '../utils';
import { useMode } from './useMode';

type SiteType = EnsureDefined<GatsbyTypes.SiteMetaQuery['site']>;
type ReturnType = EnsureDefined<SiteType['siteMetadata']>;

export default function useSiteMeta(): ReturnType {
  const { site } = useStaticQuery<GatsbyTypes.SiteMetaQuery>(
    graphql`
      query SiteMeta {
        site {
          siteMetadata {
            title
            description
            siteUrl
            defaultImage
            author {
              name
              username
              githubAccount
            }
          }
        }
      }
    `,
  );
  if (site?.siteMetadata == null) {
    throw new Error('useSiteMeta: Could not read site metadata');
  }

  // for testing in dev
  const mode = useMode();
  if (mode === 'development' && site?.siteMetadata != null) {
    (site.siteMetadata as any).siteUrl = 'http://localhost:8000';
  }

  return site?.siteMetadata;
}
