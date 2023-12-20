import React from 'react';
import { Link as GatsbyLink } from 'gatsby';
import cx from 'classnames';

import * as styles from './link.module.scss';

type Props = React.PropsWithChildren<{
  className?: string;
  href: string;
}>;

const MarkdownLink: React.FC<Props> = ({ href, className, ...rest }) => {
  const clazzName = cx(styles.linkStyle, className);

  if (href.startsWith('/') || href.startsWith('#')) {
    return <GatsbyLink to={href} className={clazzName} {...rest} />;
  }

  // eslint-disable-next-line jsx-a11y/anchor-has-content
  return <a className={clazzName} href={href} {...rest} />;
};

export default MarkdownLink;
