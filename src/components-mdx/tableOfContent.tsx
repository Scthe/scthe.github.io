/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import * as React from 'react';

import { useMode } from '../hooks/useMode';
import type { TOCEntry } from '../utils/tableOfContent';
import { generateHeaderUrl } from '../utils/generateHeaderUrl';

import * as styles from './tableOfContent.module.scss';
import { MarkdownLink } from './link';

interface Props {
  headings: TOCEntry[] | null | undefined;
}

export const TableOfContents: React.FC<Props> = ({ headings }) => {
  const mode = useMode();

  const [isExpanded, setExpanded] = React.useState(false);
  const toggleExpanded = React.useCallback(
    () => setExpanded((e) => !e),
    [setExpanded],
  );

  // artificial entry that collects all h2
  const rootEntry: TOCEntry | null =
    headings != null && headings.length > 0 ? { items: headings } : null;

  if (rootEntry == null) {
    if (mode === 'development') {
      console.warn('TableOfContents: no headings found');
    }
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
            href={`#${generateHeaderUrl(entry.title)}`}
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
