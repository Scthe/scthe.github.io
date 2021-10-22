import * as React from 'react';
import * as styles from './pageTitle.module.scss';

interface Props {
  title: string;
  date?: {
    date: string;
    isoDate: string;
  };
}

const PageTitle: React.FC<Props> = ({ title, date }) => {
  return (
    <header className={styles.postsMeta}>
      <h1 className={styles.contentTitle}>{title}</h1>

      {date != null && (
        <span className={styles.contentSubtitle}>
          <time dateTime={date.isoDate}>{date.date}</time>
        </span>
      )}
    </header>
  );
};

export default PageTitle;
