import * as React from 'react';
import { PageProps, graphql } from 'gatsby';

import Layout from '../components/layout';
import PostList from '../components/postList';
import PageTitle from '../components/pageTitle';
import { useMode } from '../hooks/useMode';
import useSiteMeta from '../hooks/useSiteMeta';
import { parseDate } from '../utils';
import filterDraftPosts from '../utils/filterDraftPosts';

type DataProps = GatsbyTypes.BlogIndexQuery;

const BlogIndex: React.FC<PageProps<DataProps>> = ({ data }) => {
  const siteMeta = useSiteMeta();
  const title = siteMeta?.title || "Scthe's blog";
  const description = siteMeta?.description || 'Mostly some programming stuff';

  const mode = useMode();
  let posts = data.allMdx.nodes;
  posts = filterDraftPosts(posts, mode !== 'production');

  return (
    <Layout
      title={title}
      description={description}
      type={{ type: 'website' }}
      canonicalUrl=""
    >
      <PageTitle title="All articles" />
      <PostList
        posts={posts.map((post) => ({
          date: parseDate(post.frontmatter!.isoDate!),
          title: post.frontmatter!.title!,
          excerpt: post.frontmatter!.excerpt!,
          permalink: post.frontmatter!.permalink!,
        }))}
      />
    </Layout>
  );
};

export default BlogIndex;

export const pageQuery = graphql`
  query BlogIndex {
    allMdx(sort: { fields: frontmatter___date, order: DESC }) {
      nodes {
        frontmatter {
          title
          permalink
          excerpt
          isoDate: date(formatString: "YYYY-MM-DDTHH:mm:ssZ")
          draft
        }
      }
    }
  }
`;
