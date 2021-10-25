import * as React from 'react';
import * as styles from './heading.module.scss';

interface Props {
  level: '2' | '3';
}

const Heading: React.FC<Props> = ({ level, children }) => {
  const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
  const id = urlify(children);

  return (
    <HeadingTag className={styles.heading} id={id}>
      {children}
      <a
        className={styles.anchor}
        aria-hidden="true"
        href={`#${id}`}
        tabIndex={-1}
      >
        §
      </a>
    </HeadingTag>
  );
};

export default Heading;

function getHeadingText(node: any): string {
  if (node == null) {
    return '';
  } else if (Array.isArray(node)) {
    return node.map((c) => getHeadingText(c)).join('');
  } else if (typeof node === 'object') {
    const ch = node?.props?.children;
    return getHeadingText(ch);
  }
  return '' + node;
}

/** https://github.com/bryanbraun/anchorjs/blob/master/anchor.js#L239 */
function urlify(children: any) {
  let text = getHeadingText(children);
  // Decode HTML characters such as '&nbsp;' first.
  const textareaElement = document.createElement('textarea');
  textareaElement.innerHTML = text;
  text = textareaElement.value;

  // Regex for finding the non-safe URL characters (many need escaping):
  //   & +$,:;=?@"#{}|^~[`%!'<>]./()*\ (newlines, tabs, backspace, vertical tabs, and non-breaking space)
  const nonsafeChars = /[& +$,:;=?@"#{}|^~[`%!'<>\]./()*\\\n\t\b\v\u00A0]/g;

  // Note: we trim hyphens after truncating because truncating can cause dangling hyphens.
  // Example string:                      // " ⚡⚡ Don't forget: URL fragments should be i18n-friendly, hyphenated, short, and clean."
  return text
    .trim() // "⚡⚡ Don't forget: URL fragments should be i18n-friendly, hyphenated, short, and clean."
    .replace(/'/gi, '') // "⚡⚡ Dont forget: URL fragments should be i18n-friendly, hyphenated, short, and clean."
    .replace(nonsafeChars, '-') // "⚡⚡-Dont-forget--URL-fragments-should-be-i18n-friendly--hyphenated--short--and-clean-"
    .replace(/-{2,}/g, '-') // "⚡⚡-Dont-forget-URL-fragments-should-be-i18n-friendly-hyphenated-short-and-clean-"
    .replace(/^-+|-+$/gm, '') // "⚡⚡-Dont-forget-URL-fragments-should-be-i18n-friendly-hyphenated"
    .toLowerCase(); // "⚡⚡-dont-forget-url-fragments-should-be-i18n-friendly-hyphenated"
}
