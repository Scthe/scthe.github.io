import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
import cx from 'classnames';
import * as ZoomModule from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';

import _ZoomRaw from 'react-medium-image-zoom';
import type { ImageRecord } from '../../utils/optimizeImage';
import * as styles from './image.module.scss';

type ZoomProps = ComponentProps<typeof _ZoomRaw>;

// `react-medium-image-zoom` ships both ESM and CJS; under Astro's SSR the
// default export can be nested on `.default`, so unwrap it defensively.
const ZoomModuleNs = ZoomModule as unknown as {
  default?: React.FC<ZoomProps> | { default?: React.FC<ZoomProps> };
};
const Zoom =
  (ZoomModuleNs.default as { default?: React.FC<ZoomProps> } | undefined)
    ?.default ??
  (ZoomModuleNs.default as React.FC<ZoomProps> | undefined) ??
  (ZoomModule as unknown as React.FC<ZoomProps>);

//////////////////////////

interface Props {
  src: string;
  alt: string;
  image: ImageRecord | null;
}

export const BlogImage: React.FC<Props> = ({ src, alt, image }) => {
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
      {image == null ? (
        <img
          src={src}
          alt={alt}
          className={cx(styles.image, styles.finalImage)}
        />
      ) : (
        <>
          <span
            className={cx(styles.image, styles.placeholder)}
            style={{
              backgroundImage: `url("${image.placeholder}")`,
              width: image.width,
              aspectRatio: `${image.width} / ${image.height}`,
              opacity: imageloaded ? 0 : 1,
            }}
          ></span>
          <div className={styles.imgWrapper}>
            <img
              src={image.src}
              srcSet={image.srcSet}
              alt={alt}
              decoding="async"
              loading="lazy"
              width={image.width}
              height={image.height}
              className={cx(styles.image, styles.finalImage)}
              style={{
                opacity: imageloaded ? 1 : 0.01,
              }}
              onLoad={onImgLoaded}
              ref={imgRef}
            />
          </div>
        </>
      )}
    </Zoom>
  );
};
