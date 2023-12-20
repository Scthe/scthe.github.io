import * as React from 'react';
import { graphql, PageProps } from 'gatsby';
import { MDXProvider } from '@mdx-js/react';

import Layout from '../components/layout';
import PageTitle from '../components/pageTitle';
import {
  Heading,
  BlogImage,
  CodeBlock,
  MarkdownLink,
  CodeBlockWrapper,
  Figure,
  Figcaption,
  RawImage,
  CrossPostLink,
  TableOfContents,
} from '../components/markdown';

import { parseDate } from '../utils';
import { BlogPostContextProvider } from '../hooks/useGetBlogPost';
import { BuildMode, useMode } from '../hooks/useMode';

import './styles/_text.module.scss';
import './styles/_lists.module.scss';
import './styles/_tables.module.scss';

require(`katex/dist/katex.min.css`);

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
  pre: CodeBlockWrapper,
  code: CodeBlock,
  Figure,
  Figcaption,
  img: RawImage,
  BlogImage,
  a: MarkdownLink,
  CrossPostLink,
  TableOfContents,
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
        `[BlogPost.template] Frontmatter does not contain '${String(k)}'`,
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
}) => {
  const mode = useMode();

  const post = data.mdx!;
  const fm = checkFrontmatter(mode, post.frontmatter);
  const date = parseDate(fm.isoDate!);

  return (
    <BlogPostContextProvider id={pageContext.id}>
      <Layout
        title={fm.title}
        description={fm.excerpt}
        canonicalUrl={fm.permalink}
        imagePublicUrl={(fm.image && fm.image.publicURL) || undefined}
        type={{
          type: 'article',
          datePublished: date,
          dateModified: date,
        }}
      >
        <PageTitle title={fm.title} date={date} />

        <div className="markdown">
          <MDXProvider components={COMPONENTS as any}>{children}</MDXProvider>
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
        image {
          publicURL
        }
        draft
        isoDate: date(formatString: "YYYY-MM-DDTHH:mm:ssZ")
      }
    }
  }
`;
