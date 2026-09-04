import * as React from 'react';
import cx from 'classnames';

import type { ImageRecord } from '../../utils/optimizeImage';
import * as stylesImg from './image.module.scss';

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Resolved+optimized record for `src` (optional; injected by the page). */
  image?: ImageRecord | null;
}

/**
 * Images that use raw markdown notation, e.g. `![Alt text](./cnn-all.gif)`.
 * Used only for GIFs.
 *
 * - Optimizable formats are pre-processed by Astro (so `image` is a resolved
 * `ImageRecord`).
 * - Non-optimizable formats (gif/svg) come through as plain
 * `<img>` with `src` being an Astro ImageMetadata-like object.
 */
export const ImageRaw: React.FC<Props> = ({ className, image, ...props }) => {
  const srcObj =
    props.src && typeof props.src === 'object' ? (props.src as any) : null;

  const finalSrc =
    image?.src ||
    srcObj?.src ||
    (typeof props.src === 'string' ? props.src : '');

  return (
    // eslint-disable-next-line jsx-a11y/alt-text
    <img
      {...props}
      className={cx(stylesImg.rawImages, className)}
      src={finalSrc}
      srcSet={image?.srcSet || props.srcSet}
      width={srcObj?.width ?? props.width}
      height={srcObj?.height ?? props.height}
    />
  );
};
