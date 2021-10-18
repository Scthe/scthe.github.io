import * as React from 'react';
import * as styles from "./postList.module.scss";
import PostListItem, { PostListItemProps } from './postListItem';

interface Props {
  posts: PostListItemProps[];
}

const PostList: React.FC<Props> = ({
  posts
}) => {
  return (
    <div className={styles.postsList}>
      <div className={styles.postsListInner}>
        {posts.map(post => <PostListItem key={post.slug} {...post} />)}
      </div>
    </div>
  );
};

export default PostList;