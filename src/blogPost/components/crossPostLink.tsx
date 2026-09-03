import * as React from 'react';
import type { TOCEntry } from '../../utils/tableOfContent';
import type { Maybe } from '../../utils';
import { useMode } from '../../hooks/useMode';
import { generateHeaderUrl } from '../../utils/generateHeaderUrl';
import MarkdownLink from './link';

type LinkedPage = { permalink: string; toc: TOCEntry[] };

type Props = React.PropsWithChildren<{
  permalink?: string;
  paragraph?: string;
  allPosts?: LinkedPage[];
  /** Permalink of the post this component is rendered in. */
  currentPermalink?: string;
}>;

const CrossPostLink: React.FC<Props> = ({
  permalink,
  paragraph,
  children,
  allPosts = [],
  currentPermalink = '',
}) => {
  const headerTitle = paragraph ?? '';
  const mode = useMode();
  const debugName = `CrossPostLink(page='${permalink}', header='${headerTitle}')`;

  const [linksToSelf, linkedPage] = getLinkedPage(
    allPosts,
    currentPermalink,
    permalink,
  );
  if (linkedPage == null) {
    if (mode === 'development') {
      console.warn(`${debugName}: page not found`);
    }
    return <>{children}</>;
  }

  // construct url
  const pageUrl = getPageUrl(linksToSelf, permalink);
  const paragraphUrl = getHeaderUrlFragment(linkedPage.toc, headerTitle);
  if (headerTitle && !paragraphUrl && mode === 'development') {
    console.warn(`${debugName}: paragraph not found. Available header titles:`, linkedPage.toc); // prettier-ignore
  }

  const finalUrl = `${pageUrl}${paragraphUrl}`;
  return finalUrl.length > 0 ? (
    <MarkdownLink href={finalUrl}>{children}</MarkdownLink>
  ) : (
    <>{children}</>
  );
};

export default CrossPostLink;

function matchPermalink(s0: Maybe<string>, s1: Maybe<string>): boolean {
  return Boolean(s0 && s1 && s0 === s1);
}

function getLinkedPage(
  allPosts: LinkedPage[],
  currentPermalink: string,
  permalink?: string,
): [boolean, LinkedPage | undefined] {
  let linksToSelf = false;

  // user has not provided permalink prop.
  // use current post
  if (permalink === undefined || permalink.length === 0) {
    linksToSelf = true;
    permalink = currentPermalink;
  }

  const linkedPage = allPosts.find((page) =>
    matchPermalink(page.permalink, permalink),
  );
  return [linksToSelf, linkedPage];
}

function getPageUrl(linksToSelf: boolean, permalink: Maybe<string>): string {
  return linksToSelf ? '' : permalink!;
}

/** Get URL fragment to the specified header */
function getHeaderUrlFragment(toc: TOCEntry[], title: string): string {
  if (title.length === 0) {
    return '';
  }

  if (checkHeaderExists(toc, title, 0)) {
    return '#' + generateHeaderUrl(title);
  }

  return '';
}

function checkHeaderExists(
  entries: TOCEntry[],
  headerTitle: string,
  depth: number,
): boolean {
  if (depth >= 3) return false;

  for (const entry of entries) {
    if (entry.title === headerTitle) {
      return true;
    }

    const children = entry.items ?? [];
    if (checkHeaderExists(children, headerTitle, depth + 1)) {
      return true;
    }
  }

  return false;
}
