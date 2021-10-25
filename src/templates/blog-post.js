import * as React from 'react';
import { graphql } from 'gatsby';
import { MDXRenderer } from 'gatsby-plugin-mdx';
import { MDXProvider } from '@mdx-js/react';

import Layout from '../components/layout';
import PageTitle from '../components/pageTitle';
import Heading from '../components/markdown/heading';
import BlogImage from '../components/markdown/image';
import CodeBlock, { CodeBlockWrapper } from '../components/markdown/codeBlock';
import {
  interceptBlockMath,
  interceptInlineMath,
} from '../components/markdown/math';

import { BlogPostContextProvider } from '../hooks/useGetBlogPost';
import './styles/_text.module.scss';
import * as linkStyles from './styles/_links.module.scss';
import './styles/_lists.module.scss';
import './styles/_tables.module.scss';
import * as figureStyles from './styles/_figure.module.scss';

const COMPONENTS = {
  h2: (props) => <Heading level="2" {...props} />,
  h3: (props) => <Heading level="3" {...props} />,
  pre: (props) => <CodeBlockWrapper {...props} />,
  code: (props) => <CodeBlock {...props} />,
  Figure: (props) => <figure className={figureStyles.figure} {...props} />,
  // figcaption requires blank lines before and after!!!
  Figcaption: (props) => (
    <figcaption className={figureStyles.figcaption} {...props} />
  ),
  div: interceptBlockMath,
  span: interceptInlineMath,
  // eslint-disable-next-line jsx-a11y/anchor-has-content
  a: (props) => <a className={linkStyles.linkStyle} {...props} />,
  BlogImage,
};

// TODO SEO
const BlogPostTemplate = ({ data, pageContext }) => {
  const post = data.mdx;
  const fm = post.frontmatter;

  return (
    <BlogPostContextProvider id={pageContext.id}>
      <Layout title={fm.title}>
        <PageTitle title={fm.title} date={fm} />

        <div className="markdown">
          <MDXProvider components={COMPONENTS}>
            <MDXRenderer>{post.body}</MDXRenderer>
          </MDXProvider>
        </div>
      </Layout>
    </BlogPostContextProvider>
  );
};

export default BlogPostTemplate;

export const pageQuery = graphql`
  query BlogPostBySlug($id: String!) {
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
