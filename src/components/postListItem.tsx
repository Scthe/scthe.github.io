import * as React from 'react';
import { Link } from 'gatsby';
import * as styles from "./postListItem.module.scss";

export interface PostListItemProps {
  title: string;
  date: string;
  isoDate: string;
  slug: string;
  excerpt: string;
}

const PostListItem: React.FC<PostListItemProps> = ({
  title, date, isoDate, slug, excerpt
}) => {
  return (
    <article className={styles.postItem} itemType="http://schema.org/Article">
      <header>
        <h2 className={styles.postItemTitle} itemProp="headline">
          <Link to={slug} itemProp="url">
            {title}
          </Link>
        </h2>

        <div className={styles.postItemMetaRow}>
          <time className={styles.postItemDate} dateTime={isoDate}>
            {date}
          </time>
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
          <Link to={slug} tabIndex={-1} className={styles.postItemReadMoreLink}>
            {title}
          </Link>
          <span aria-hidden="true">&rarr;</span>
        </span>
      </footer>
    </article>
  );
};

export default PostListItem;