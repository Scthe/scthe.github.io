import React, { useContext } from 'react';
import { useStaticQuery, graphql } from 'gatsby';
import { ArrayItemType } from '../utils';

const BlogPostContext = React.createContext({});
type Props = React.PropsWithChildren<{ id: string }>;

export const BlogPostContextProvider: React.FC<Props> = ({ id, children }) => (
  <BlogPostContext.Provider value={id}>{children}</BlogPostContext.Provider>
);

type NodeArray = GatsbyTypes.BlogPostsQuery['allMdx']['nodes'];
type ReturnType = ArrayItemType<NodeArray>;

export default function useGetBlogPost(): ReturnType {
  const id = useContext(BlogPostContext);

  const { allMdx } = useStaticQuery<GatsbyTypes.BlogPostsQuery>(graphql`
    query BlogPosts {
      allMdx {
        nodes {
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
            permalink
          }
        }
      }
    }
  `);

  const node = allMdx.nodes.find((e) => e.id === id);

  if (node == null) {
    const allPosts = allMdx.nodes.map((e) => ({
      id: e.id,
      title: e.frontmatter?.title,
    }));
    console.warn('Available blog posts:', allPosts);
    throw new Error(`useGetBlogPost could not find blog post id='${id}'`);
  }

  return node;
}
