import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getImage } from 'gatsby-plugin-image';
import cx from 'classnames';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';

import { getRelativeDirectory, joinPaths } from '../../utils';
import useGetStaticImageData from '../../hooks/useGetStaticImageData';
import useGetBlogPost from '../../hooks/useGetBlogPost';
import * as styles from './image.module.scss';

interface Props {
  src: string;
  alt: string;
}

const BlogImage: React.FC<Props> = ({ src, alt }) => {
  const mdPage = useGetBlogPost();
  const blogPostDir = getRelativeDirectory(mdPage?.parent);
  const imagePath = joinPaths(blogPostDir || '', src);

  const imgData = useGetStaticImageData(imagePath);
  const image = imgData != null ? getImage(imgData as any) : undefined;

  const imgRef = useRef<HTMLImageElement>(null);
  const [imageloaded, setImageloaded] = useState(false);
  const onImgLoaded = useCallback(() => setImageloaded(true), []);

  // handle when image accessed from cache
  useEffect(() => {
    if (imgRef.current?.complete) {
      onImgLoaded();
    }
  }, [onImgLoaded]);

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
      <div className={styles.imgWrapper}>
        <img
          {...image?.images.fallback}
          src={image?.images.fallback?.src || src}
          alt={alt}
          decoding="async"
          loading="lazy"
          width={image?.width}
          height={image?.height}
          className={cx(styles.image, styles.finalImage)}
          style={{
            backgroundColor: image?.backgroundColor,
            opacity: imageloaded ? 1 : 0.01,
          }}
          onLoad={onImgLoaded}
          ref={imgRef}
        />
      </div>
    </Zoom>
  );
};

export default BlogImage;
