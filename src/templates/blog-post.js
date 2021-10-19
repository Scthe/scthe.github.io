import * as React from 'react';
import { graphql } from 'gatsby';
import { MDXRenderer } from 'gatsby-plugin-mdx';
import { MDXProvider } from '@mdx-js/react';

import Layout from '../components/layout';
import PageTitle from '../components/pageTitle';

import './styles/_text.module.scss';
import './styles/_links.module.scss';
import './styles/_lists.module.scss';
import './styles/_tables.module.scss';

const shortcodes = {
  /*PageHeader*/
};

// TODO SEO
const BlogPostTemplate = ({ data }) => {
  const post = data.mdx;
  const fm = post.frontmatter;

  return (
    <Layout title={fm.title}>
      <PageTitle title={fm.title} date={fm} />

      <div className="markdown">
        <MDXProvider components={shortcodes}>
          <MDXRenderer>{post.body}</MDXRenderer>
        </MDXProvider>
      </div>
    </Layout>
  );
};

export default BlogPostTemplate;

export const pageQuery = graphql`
  query BlogPostBySlug($id: String!) {
    site {
      siteMetadata {
        title
      }
    }
    mdx(id: { eq: $id }) {
      id
      body
      frontmatter {
        title
        permalink
        excerpt
        date(formatString: "DD MMM YYYY")
        isoDate: date(formatString: "YYYY-MM-DDTHH:mm:ssZ")
      }
    }
  }
`;
