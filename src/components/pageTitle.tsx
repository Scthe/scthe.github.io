import * as React from 'react';
import * as styles from './pageTitle.module.scss';

interface Props {
  title: string;
  subtitle?: string;
  date?: {
    date: string;
    isoDate: string;
  };
}

const PageTitle: React.FC<Props> = ({ title, subtitle, date }) => {
  return (
    <header className={styles.postsMeta}>
      <h1 className={styles.contentTitle}>{title}</h1>

      {date != null && (
        <span className={styles.contentSubtitle}>
          <time dateTime={date.isoDate}>{date.date}</time>
        </span>
      )}

      {subtitle != null && (
        <span className={styles.contentSubtitle}>{subtitle}</span>
      )}
    </header>
  );
};

export default PageTitle;
