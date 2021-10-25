import { useStaticQuery, graphql } from 'gatsby';

type ReturnType = GatsbyTypes.BlogPostQuery['mdx'];

export default function useGetBlogPost(): ReturnType {
  const { mdx } = useStaticQuery<GatsbyTypes.BlogPostQuery>(
    graphql`
      query BlogPost {
        mdx {
          id
          parent {
            ... on File {
              name
              absolutePath
              relativeDirectory
            }
          }
          frontmatter {
            title
          }
        }
      }
    `,
  );

  return mdx as any;
}
