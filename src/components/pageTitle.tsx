import * as React from 'react';
import * as styles from './pageTitle.module.scss';

interface Props {
  title: string;
}

const PageTitle: React.FC<Props> = ({ title }) => {
  return (
    <header className={styles.postsMeta}>
      <h1 className={styles.contentTitle}>{title}</h1>
    </header>
  );
};

export default PageTitle;
