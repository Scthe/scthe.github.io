import * as React from 'react';
import { generateHeaderUrl } from '../utils/generateHeaderUrl';
import * as styles from './heading.module.scss';

type Props = React.PropsWithChildren<{
  level: '2' | '3';
}>;

export const Heading: React.FC<Props> = ({ level, children }) => {
  const HeadingTag = `h${level}` as keyof React.JSX.IntrinsicElements;
  const id = generateHeaderUrl(children);

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
