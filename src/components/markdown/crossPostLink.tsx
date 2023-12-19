import * as React from 'react';
import { graphql, useStaticQuery } from 'gatsby';
import { useMode } from '../../hooks/useMode';
import MarkdownLink from './link';
import { urlify } from './heading';

type Props = React.PropsWithChildren<{
  permalink: string;
  paragraph?: string;
}>;

type TOCEntry = {
  // TODO also contains permalink. Use instead of calc own?
  title?: string;
  items?: TOCEntry[];
};

const CrossPostLink: React.FC<Props> = ({ permalink, paragraph, children }) => {
  const debugName = `CrossPostLink('${permalink || ''}', '${paragraph || ''}')`;
  const mode = useMode();

  const { allMdx } = useStaticQuery<GatsbyTypes.CrossPostLinkQuery>(graphql`
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

  const page = allMdx.nodes.find(
    (page) => page.frontmatter?.permalink === `/blog/${permalink}/`,
  );
  if (page == null) {
    if (mode === 'development') {
      console.warn(`${debugName}, page not found`);
    }
    return children;
  }

  // find paragraph
  let crossLink = page.frontmatter!.permalink!;
  const toc = findParagraph(page.tableOfContents, paragraph);
  if (toc) {
    const paragraphUrl = (toc?.title && urlify(toc.title)) || '';
    crossLink = `${crossLink}#${paragraphUrl}`;
  } else if (paragraph && mode === 'development') {
    console.warn(`${debugName} paragraph not found`, page.tableOfContents);
  }

  return <MarkdownLink href={crossLink}>{children}</MarkdownLink>;
};

export default CrossPostLink;

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
