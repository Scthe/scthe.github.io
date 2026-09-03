import * as React from 'react';

import { useMode } from '../hooks/useMode';
import Date from './date';
import * as styles from './postListItem.module.scss';

export interface PostListItemProps {
  title: string;
  date: Date;
  permalink: string;
  excerpt: string;
  absolutePath: string;
}

const PostListItem: React.FC<PostListItemProps> = ({
  title,
  date,
  permalink,
  excerpt,
  absolutePath,
}) => {
  const mode = useMode();
  const isValid = title && date;
  if (mode === 'development' && !isValid) {
    console.warn(`Probably invalid post file: '${absolutePath}'`);
  }

  return (
    <article className={styles.postItem} itemType="http://schema.org/Article">
      <header>
        <h2 className={styles.postItemTitle} itemProp="headline">
          <a href={permalink} itemProp="url">
            {title}
          </a>
        </h2>

        <div className={styles.postItemMetaRow}>
          <Date className={styles.postItemDate} date={date} />
        </div>
      </header>
      <section>
        <p className={styles.postItemExcerpt} itemProp="description">
          {excerpt}
        </p>
      </section>
      <footer>
        <span className={styles.postItemReadMore}>
          Continue reading
          <a
            href={permalink}
            tabIndex={-1}
            className={styles.postItemReadMoreLink}
          >
            {title}
          </a>
          <span aria-hidden="true"> &rarr;</span>
        </span>
      </footer>
    </article>
  );
};

export default PostListItem;
