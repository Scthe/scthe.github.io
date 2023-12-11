import * as React from 'react';
import { graphql, PageProps } from 'gatsby';
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
import { BuildMode, useMode } from '../hooks/useMode';

import './styles/_text.module.scss';
import './styles/_lists.module.scss';
import './styles/_tables.module.scss';
import * as figureStyles from './styles/_figure.module.scss';

type PT = any;

// TODO add table of contents like in https://atlassian.design/foundations/color (it even scrolls nicely) as <nav> with aria-label="Table of contents"
// TODO "Published on:" text before date
// TODO more internal links
// TODO scroll to top
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
type Frontmatter = NonNullable<NonNullable<DataProps['mdx']>['frontmatter']>;
type FrontmatterKeys = keyof NonNullable<Frontmatter>; // required by TS
type RequiredFrontmatter = {
  [K in FrontmatterKeys]: NonNullable<Frontmatter[K]>;
};

interface PageTemplateContext {
  id: string;
}

function checkFrontmatter(
  mode: BuildMode,
  fm: Frontmatter | null,
): RequiredFrontmatter {
  if (fm == null) {
    throw new Error('[BlogPost.template] No frontmatter found');
  }

  const check = (k: keyof Frontmatter) => {
    if (mode === 'development' && fm[k] == null) {
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

  return fm as any;
}

const BlogPostTemplate: React.FC<PageProps<DataProps, PageTemplateContext>> = ({
  data,
  pageContext,
  children,
  ...rest
}) => {
  const mode = useMode();
  console.log('data', data);
  console.log('pageContext', pageContext);
  console.log('rest', rest);

  const post = data.mdx!;
  const fm = checkFrontmatter(mode, post.frontmatter);
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
          <MDXProvider components={COMPONENTS}>{children}</MDXProvider>
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
      #body
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
