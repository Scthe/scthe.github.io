import * as React from 'react';
import { graphql, PageProps } from 'gatsby';
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
import MarkdownLink from '../components/markdown/link';

import { parseDate } from '../utils';
import { BlogPostContextProvider } from '../hooks/useGetBlogPost';
import { useMode } from '../hooks/useMode';

import './styles/_text.module.scss';
import './styles/_lists.module.scss';
import './styles/_tables.module.scss';
import * as figureStyles from './styles/_figure.module.scss';

type PT = any;

// TODO add table of contents like in https://atlassian.design/foundations/color (it even scrolls nicely)
// TODO sentry
// TODO [P5] table <caption>, row header etc.
// TODO [P5] Use reduced-motion for gifs?

const COMPONENTS = {
  h2: (props: PT) => <Heading level="2" {...props} />,
  h3: (props: PT) => <Heading level="3" {...props} />,
  pre: (props: PT) => <CodeBlockWrapper {...props} />,
  code: (props: PT) => <CodeBlock {...props} />,
  Figure: (props: PT) => <figure className={figureStyles.figure} {...props} />,
  // figcaption requires blank lines before and after!!!
  Figcaption: (props: PT) => (
    <figcaption className={figureStyles.figcaption} {...props} />
  ),
  // usually a noop, unless we detect it's a math block
  div: interceptBlockMath,
  span: interceptInlineMath,
  // Raw images using ` ![Alt text](./cnn-all.gif)`
  // eslint-disable-next-line jsx-a11y/alt-text
  img: (props: PT) => <img className={figureStyles.rawImages} {...props} />,
  BlogImage,
  a: (props: PT) => <MarkdownLink {...props} />,
};

type DataProps = GatsbyTypes.BlogPostBySlugQuery;
type PostType = DataProps['mdx'];
interface PageTemplateContext {
  id: string;
}

function checkFrontmatter(data: PostType) {
  if (data?.frontmatter == null) {
    throw new Error('[BlogPost.template] No frontmatter found');
  }
  const fm = data.frontmatter;
  const check = (k: keyof typeof fm) => {
    if (fm[k] == null) {
      console.error(
        `[BlogPost.template] Frontmatter does not contain '${k}'`,
        fm,
      );
    }
  };
  check('title');
  check('permalink');
  check('excerpt');
  check('image');
  check('isoDate');
  check('draft');
}

const BlogPostTemplate: React.FC<PageProps<DataProps, PageTemplateContext>> = ({
  data,
  pageContext,
}) => {
  const mode = useMode();

  const post = data.mdx!;
  if (mode === 'development') {
    checkFrontmatter(post);
  }
  const fm = post.frontmatter!;
  const date = parseDate(fm.isoDate!);

  return (
    <BlogPostContextProvider id={pageContext.id}>
      <Layout
        title={fm.title}
        description={fm.excerpt!}
        canonicalUrl={fm.permalink!}
        image={fm.image!}
        type={{
          type: 'article',
          datePublished: date,
          dateModified: date,
        }}
      >
        <PageTitle title={fm.title} date={date} />

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
        image
        draft
        isoDate: date(formatString: "YYYY-MM-DDTHH:mm:ssZ")
      }
    }
  }
`;
