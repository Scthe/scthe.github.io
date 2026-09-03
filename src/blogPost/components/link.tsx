import React from 'react';
import cx from 'classnames';

import * as styles from './link.module.scss';

type Props = React.PropsWithChildren<{
  className?: string;
  href: string;
}>;

const MarkdownLink: React.FC<Props> = ({ href, className, ...rest }) => {
  const clazzName = cx(styles.linkStyle, className);

  // eslint-disable-next-line jsx-a11y/anchor-has-content
  return <a className={clazzName} href={href} {...rest} />;
};

export default MarkdownLink;
