export type TOCEntry = {
  title?: string;
  // url?: string; // does not work if title has '/'
  items?: TOCEntry[];
};

type HeadingInfo = { depth: number; title: string };

/** Matches markdown headers h2, h3 */
const MD_HEADING = /^(#{2,3})\s+(.*)$/;

/** Extract `##`/`###` headings from a raw markdown/MDX body (skips code fences). */
function parseHeadings(body: string): HeadingInfo[] {
  const result: HeadingInfo[] = [];
  let inFence = false;

  for (const rawLine of body.split(`\n`)) {
    const trimmed = rawLine.trim();

    if (/^(```|~~~)/.test(trimmed)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }

    const match = MD_HEADING.exec(trimmed);
    if (match == null) {
      continue;
    }

    const depth = match[1].length;
    const title = stripInlineMarkdown(match[2]);
    if (title.length > 0) {
      result.push({ depth, title });
    }
  }

  return result;
}

function stripInlineMarkdown(line: string): string {
  let t = line;
  // `[x](url)` nested inside parens: `( [x](url) )` -> `(x)`
  t = t.replace(/\(\[([^\]]*)\]\([^)]*\)\)/g, `($1)`);
  // `[x](url)` -> `x`
  t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, `$1`);
  // inline code `` `x` `` -> `x`
  t = t.replace(/`([^`]*)`/g, `$1`);
  // **bold** / __bold__
  t = t.replace(/\*\*([^*]+)\*\*/g, `$1`);
  t = t.replace(/__([^_]+)__/g, `$1`);
  // inline math $x$ -> x
  t = t.replace(/\$([^$]+)\$/g, `$1`);
  // *italic* (single asterisks that survive the steps above)
  t = t.replace(/\*([^*]+)\*/g, `$1`);
  t = t.trim();
  return t;
}

/** Nest a flat heading list into a `TOCEntry` tree (h2 -> h3). */
function headingsToTree(headings: HeadingInfo[]): TOCEntry[] {
  const roots: TOCEntry[] = [];
  let current: TOCEntry | null = null;

  for (const h of headings) {
    const node: TOCEntry = { title: h.title, items: [] };
    if (h.depth === 2) {
      roots.push(node);
      current = node;
    } else if (h.depth === 3 && current != null) {
      current.items = current.items ?? [];
      current.items.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/** Parse a raw post body into a nested TOC used for validation + rendering. */
export function buildTableOfContentFromBody(body: string): TOCEntry[] {
  return headingsToTree(parseHeadings(body));
}
