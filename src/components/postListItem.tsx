import * as React from 'react';
import { Link } from 'gatsby';

import Date from './date';
import * as styles from './postListItem.module.scss';

export interface PostListItemProps {
  title: string;
  date: Date;
  permalink: string;
  excerpt: string;
}

const PostListItem: React.FC<PostListItemProps> = ({
  title,
  date,
  permalink,
  excerpt,
}) => {
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
          Continue reading&nbsp;
          <Link
            to={permalink}
            tabIndex={-1}
            className={styles.postItemReadMoreLink}
          >
            {title}
          </Link>
          <span aria-hidden="true">&nbsp;&rarr;</span>
        </span>
      </footer>
    </article>
  );
};

export default PostListItem;
