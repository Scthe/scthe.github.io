import React, { useCallback, useState } from 'react';
import { getImage } from 'gatsby-plugin-image';
import cx from 'classnames';
import useGetStaticImageData from '../../hooks/useGetStaticImageData';
import * as styles from './image.module.scss';

// TODO <figure>, <figcaption>
// TODO Use  <MDXRenderer>{post.body}</MDXRenderer> for caption?

interface Props {
  src: string;
  alt: string;
}

const BlogImage: React.FC<Props> = ({ src, alt }) => {
  // TODO hardcoded
  // Get site parent to get file info, build static url to image and query `file...`
  const blogPostDir = '2015-08-12-md-test';
  const imagePath = `${blogPostDir}${src.substring(1)}`;

  const imgData = useGetStaticImageData(imagePath); // TODO handle undefined
  const image = getImage(imgData as any);

  const [imageloaded, setImageloaded] = useState(false);
  const onImgLoaded = useCallback(() => setImageloaded(true), []);

  return (
    <figure>
      <a href={src} className={styles.link}>
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
        <img
          {...image?.images.fallback}
          alt={alt}
          decoding="async"
          loading="lazy"
          width={image?.width}
          height={image?.height}
          className={cx(styles.image, styles.img)}
          style={{
            backgroundColor: image?.backgroundColor,
            opacity: imageloaded ? 1 : 0,
          }}
          onLoad={onImgLoaded}
        />
      </a>

      {/* <figcaption>{{ image_caption }}</figcaption> */}
    </figure>
  );
};

export default BlogImage;
