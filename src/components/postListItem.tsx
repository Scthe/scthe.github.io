import * as React from 'react';
import { Link } from 'gatsby';

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
          <Link to={permalink} itemProp="url">
            {title}
          </Link>
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
          <Link
            to={permalink}
            tabIndex={-1}
            className={styles.postItemReadMoreLink}
          >
            {title}
          </Link>
          <span aria-hidden="true"> &rarr;</span>
        </span>
      </footer>
    </article>
  );
};

export default PostListItem;
