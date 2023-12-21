import * as React from 'react';
import { graphql, useStaticQuery } from 'gatsby';
import { BuildMode, useMode } from '../../hooks/useMode';
import MarkdownLink from './link';
import { urlify } from './heading';
import { TOCEntry } from './tableOfContent';
import useGetBlogPost, { CurrentBlogPost } from '../../hooks/useGetBlogPost';
import { ArrayItemType, Maybe } from 'src/utils';

type Query = GatsbyTypes.CrossPostLinkQuery;
type LinkedPage = ArrayItemType<Query['allMdx']['nodes']> & {
  readonly tableOfContents: TOCEntry[];
};

type Props = React.PropsWithChildren<{
  permalink?: string;
  paragraph?: string;
}>;

const CrossPostLink: React.FC<Props> = ({ permalink, paragraph, children }) => {
  const mode = useMode();
  const currentPost = useGetBlogPost();

  const { allMdx } = useStaticQuery<Query>(graphql`
    query CrossPostLink {
      allMdx {
        nodes {
          tableOfContents(maxDepth: 3)
          frontmatter {
            permalink
          }
        }
      }
    }
  `);

  const [linksToSelf, linkedPage] = getPage(allMdx, currentPost, permalink);
  if (linkedPage == null) {
    const debugName = `CrossPostLink('${permalink}', '${paragraph}')`;
    if (mode === 'development') {
      console.warn(`${debugName}, page not found`);
    }
    return children;
  }

  // construct url
  const pageUrl = getPageUrl(linksToSelf, permalink);
  const paragraphUrl = getParagraphUrl(
    mode,
    linkedPage.tableOfContents,
    paragraph,
  );

  const finalUrl = `${pageUrl}${paragraphUrl}`;
  /*console.log(permalink, paragraph, {
    linkedPage,
    pageUrl,
    paragraphUrl,
    finalUrl,
  });*/
  return finalUrl.length > 0 ? (
    <MarkdownLink href={finalUrl}>{children}</MarkdownLink>
  ) : (
    <>{children}</>
  );
};

export default CrossPostLink;

function matchPermalink(s0: Maybe<string>, s1: Maybe<string>): boolean {
  if (!s0 || !s1) {
    return false;
  }
  return s0 === s1;
}

function getPage(
  allMdx: Query['allMdx'],
  currentPost: CurrentBlogPost,
  permalink?: string,
): [boolean, LinkedPage | undefined] {
  let linksToSelf = false;
  // user has not provided permalink prop.
  // use current post
  if (permalink === undefined || permalink.length === 0) {
    linksToSelf = true;
    permalink = currentPost.frontmatter?.permalink || undefined;
  }
  const linkedPage = allMdx.nodes.find((page) => {
    const pl = page.frontmatter?.permalink;
    return matchPermalink(pl, permalink);
  });
  return [linksToSelf, linkedPage];
}

function getPageUrl(linksToSelf: boolean, permalink: Maybe<string>): string {
  return linksToSelf ? '' : permalink!;
}

function findParagraph(
  toc: TOCEntry,
  paragraph: string | undefined,
): TOCEntry | undefined {
  const searchParagraph = (
    toc: TOCEntry,
    depth: number,
  ): TOCEntry | undefined => {
    if (depth >= 3) {
      return undefined;
    }
    if (toc.title === paragraph) {
      return toc;
    }
    for (const tt of toc.items || []) {
      const res = searchParagraph(tt, depth + 1);
      if (res) return res;
    }
    return undefined;
  };

  if (!paragraph) {
    return undefined;
  }
  return searchParagraph(toc, 0);
}

function getParagraphUrl(
  mode: BuildMode,
  toc: TOCEntry,
  title?: string | undefined,
): string {
  if (!title || title.length === 0) {
    return '';
  }

  const isValidParagraphTitle = findParagraph(toc, title) !== undefined;

  if (isValidParagraphTitle) {
    return '#' + urlify(title);
  }
  if (mode === 'development') {
    console.warn(`CrossPostLink: paragraph '${title}' not found`, toc);
  }
  return '';
}
