/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import * as React from 'react';
import { graphql, useStaticQuery } from 'gatsby';

import { useMode } from '../../hooks/useMode';
import useGetBlogPost from '../../hooks/useGetBlogPost';
import { urlify } from './heading';

import * as styles from './tableOfContent.module.scss';
import MarkdownLink from './link';

interface Props {}

export type TOCEntry = {
  title?: string;
  // url?: string; // does not work if title has '/'
  items?: TOCEntry[];
};

const TableOfContents: React.FC<Props> = () => {
  const pageData = useGetBlogPost();
  const mode = useMode();
  const [isExpanded, setExpanded] = React.useState(false);
  const toggleExpanded = React.useCallback(
    () => setExpanded((e) => !e),
    [setExpanded],
  );

  const { allMdx } = useStaticQuery<GatsbyTypes.TableOfContentsQuery>(graphql`
    query TableOfContents {
      allMdx {
        nodes {
          frontmatter {
            permalink
          }
          tableOfContents(maxDepth: 3)
        }
      }
    }
  `);

  const page = allMdx.nodes.find(
    (page) => page.frontmatter?.permalink === pageData.frontmatter?.permalink,
  );
  if (page == null) {
    if (mode === 'development') {
      console.warn('TableOfContents: Page not found', pageData);
    }
    return null;
  }

  const rootEntry = page.tableOfContents as TOCEntry | null;
  if (!rootEntry || !rootEntry.items || rootEntry.items.length === 0) {
    return null;
  }

  if (mode !== 'development') {
    return null;
  }

  const expandedSign = isExpanded ? '-' : '+';

  // hide on speech readers. It's a build-in for them (based on header tags)
  return (
    <div className={styles.tocWrapper} aria-hidden="true">
      <h2 className={styles.tocContentsHeader} onClick={toggleExpanded}>
        <span className={styles.tocExpandBtn}>[{expandedSign}]</span>
        &nbsp;Contents
      </h2>
      {isExpanded && (
        <div className={styles.tocContentWrapper}>
          <TocEntryLink entry={rootEntry} level={0} />
        </div>
      )}
    </div>
  );
};

export default TableOfContents;

const TocEntryLink: React.FC<{ entry: TOCEntry; level: number }> = ({
  entry,
  level,
}) => {
  const children = entry.items || [];
  return (
    <>
      {entry.title ? (
        <li className={styles.tocEntryItem} data-toc-level={level}>
          <MarkdownLink
            href={`#${urlify(entry.title)}`}
            className={styles.tocEntryLink}
          >
            {entry.title}
          </MarkdownLink>
        </li>
      ) : null}

      {children.length > 0 ? (
        <ol className={styles.tocEntryChildrenList} data-toc-level={level}>
          {children.map((e, i) => (
            <TocEntryLink key={i} entry={e} level={level + 1} />
          ))}
        </ol>
      ) : null}
    </>
  );
};
