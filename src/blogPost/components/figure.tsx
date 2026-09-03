import * as React from 'react';
import cx from 'classnames';

import * as styles from './figure.module.scss';

type Props = any;

export const Figure = ({ className, ...props }: Props) => {
  return <figure className={cx(styles.figure, className)} {...props} />;
};

/** figcaption requires blank lines before and after!!! */
export const Figcaption = (props: Props) => (
  <figcaption className={styles.figcaption} {...props} />
);
