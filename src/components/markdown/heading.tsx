import * as React from 'react';
import { convert } from 'url-slug';
import * as styles from './heading.module.scss';

type Props = React.PropsWithChildren<{
  level: '2' | '3';
}>;

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
export function urlify(children: any) {
  const text = getHeadingText(children);
  return convert(text);
}
