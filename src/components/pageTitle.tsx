import * as React from 'react';

import Date from './date';
import * as styles from './pageTitle.module.scss';

interface Props {
  title: string;
  subtitle?: string;
  date?: Date;
}

const PageTitle: React.FC<Props> = ({ title, subtitle, date }) => {
  return (
    <header className={styles.postsMeta}>
      <h1 className={styles.contentTitle}>{title}</h1>

      {date != null && (
        <span className={styles.contentSubtitle}>
          <Date date={date} />
        </span>
      )}

      {subtitle != null && (
        <span className={styles.contentSubtitle}>{subtitle}</span>
      )}
    </header>
  );
};

export default PageTitle;
