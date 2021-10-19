import * as React from 'react';
import { PageProps, graphql } from 'gatsby';

import Layout from '../components/layout';
import PostList from '../components/postList';
import PageTitle from '../components/pageTitle';

type DataProps = GatsbyTypes.BlogIndexQuery;

const BlogIndex: React.FC<PageProps<DataProps>> = ({ data }) => {
  const siteTitle = data.site!.siteMetadata?.title || `Title`;
  const posts = data.allMdx.nodes;

  // TODO <Seo title="All articles" />;
  return (
    <Layout title={siteTitle}>
      <PageTitle title="All articles" />
      <PostList
        posts={posts.map((post) => ({
          date: post.frontmatter!.date!,
          isoDate: post.frontmatter!.isoDate!,
          title: post.frontmatter!.title!,
          excerpt: post.frontmatter!.description!,
          slug: post.frontmatter!.slug!,
        }))}
      />
    </Layout>
  );
};

export default BlogIndex;

export const pageQuery = graphql`
  query BlogIndex {
    site {
      siteMetadata {
        title
      }
    }
    allMdx(sort: { fields: frontmatter___date, order: DESC }) {
      nodes {
        frontmatter {
          slug
          title
          description
          date(formatString: "DD MMM YYYY")
          isoDate: date(formatString: "YYYY-MM-DDTHH:mm:ssZ")
        }
      }
    }
  }
`;
