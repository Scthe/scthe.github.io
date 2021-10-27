import React, { useCallback, useState } from 'react';
import { getImage } from 'gatsby-plugin-image';
import cx from 'classnames';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';

import { joinPaths } from '../../utils';
import useGetStaticImageData from '../../hooks/useGetStaticImageData';
import useGetBlogPost from '../../hooks/useGetBlogPost';
import * as styles from './image.module.scss';

// TODO finish _to_migrate
interface Props {
  src: string;
  alt: string;
}

const BlogImage: React.FC<Props> = ({ src, alt }) => {
  const mdPage = useGetBlogPost();
  const blogPostDir = mdPage?.parent?.relativeDirectory;
  const imagePath = joinPaths(blogPostDir || '', src);

  const imgData = useGetStaticImageData(imagePath);
  const image = imgData != null ? getImage(imgData as any) : undefined;

  // TODO this does not always work
  const [imageloaded, setImageloaded] = useState(false);
  const onImgLoaded = useCallback(() => setImageloaded(true), []);

  return (
    <Zoom
      wrapStyle={{ position: 'relative', display: 'block' }}
      overlayBgColorStart="transparent"
      overlayBgColorEnd="rgba(0, 0, 0, 0.7)"
    >
      <span
        className={cx(styles.image, styles.placeholder)}
        style={{
          backgroundColor: image?.backgroundColor,
          backgroundImage: `url("${image?.placeholder?.fallback}")`,
          width: image?.width,
          aspectRatio: `${image?.width} / ${image?.height}`,
          opacity: imageloaded ? 0 : 1,
        }}
      ></span>
      <div
        className={styles.imgWrapper}
        style={{
          opacity: imageloaded ? 1 : 0,
        }}
      >
        <img
          {...image?.images.fallback}
          src={image?.images.fallback?.src || src}
          alt={alt}
          decoding="async"
          loading="lazy"
          width={image?.width}
          height={image?.height}
          className={styles.image}
          style={{
            backgroundColor: image?.backgroundColor,
          }}
          onLoad={onImgLoaded}
        />
      </div>
    </Zoom>
  );
};

export default BlogImage;
