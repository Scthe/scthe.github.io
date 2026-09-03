import { convert } from 'url-slug';

/** https://github.com/bryanbraun/anchorjs/blob/master/anchor.js#L239 */
export function generateHeaderUrl(children: any) {
  const text = getHeadingText(children);
  return convert(text);
}

function getHeadingText(node: any): string {
  if (node == null) {
    return '';
  } else if (Array.isArray(node)) {
    return node.map((c) => getHeadingText(c)).join('');
  } else if (typeof node === 'object') {
    const p = node?.props;
    if (p != null) {
      const child = p.children ?? p.value;
      return getHeadingText(child);
    }
    // boxed String/Number objects (Astro serializes marker `value`s)
    return '' + node;
  }
  return '' + node;
}
