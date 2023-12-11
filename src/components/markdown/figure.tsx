import * as React from 'react';
import cx from 'classnames';

import * as styles from './figure.module.scss';

type PT = any;

export const Figure = ({ className, ...props }: PT) => {
  return <figure className={cx(styles.figure, className)} {...props} />;
};

/** figcaption requires blank lines before and after!!! */
export const Figcaption = (props: PT) => (
  <figcaption className={styles.figcaption} {...props} />
);

/** Raw images using ` ![Alt text](./cnn-all.gif)` */
export const RawImage = (props: PT) => (
  // eslint-disable-next-line jsx-a11y/alt-text
  <img className={styles.rawImages} {...props} />
);
