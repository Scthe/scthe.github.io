import * as React from 'react';
import * as styles from './postList.module.scss';
import PostListItem, { PostListItemProps } from './postListItem';

interface Props {
  posts: PostListItemProps[];
}

const PostList: React.FC<Props> = ({ posts }) => {
  return (
    <div className={styles.postsList}>
      <ol className={styles.postsListInner}>
        {posts.map((post) => (
          <li key={post.permalink} className={styles.postItem}>
            <PostListItem {...post} />
          </li>
        ))}
      </ol>
    </div>
  );
};

export default PostList;
