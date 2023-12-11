import React from 'react';
import { Link as GatsbyLink } from 'gatsby';

import * as styles from './link.module.scss';

type Props = React.PropsWithChildren<{
  href: string;
}>;

const MarkdownLink: React.FC<Props> = ({ href, ...rest }) => {
  if (href.startsWith('/')) {
    return <GatsbyLink to={href} className={styles.linkStyle} {...rest} />;
  }

  // eslint-disable-next-line jsx-a11y/anchor-has-content
  return <a className={styles.linkStyle} href={href} {...rest} />;
};

export default MarkdownLink;
