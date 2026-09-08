import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
import cx from 'classnames';
import * as ZoomModule from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';

import _ZoomRaw from 'react-medium-image-zoom';
import type { ImageRecord } from '../utils/optimizeImage';
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

/*
Warning: previous versions used CSS background-color to add some background in case
the image has some transparency. This causes a problem when this background color
is shown in a split second before the image is downloaded or even inserted into DOM
from cache. Seen as a bright flash in dark mode when opening a dark image.
To fix, just set a background as a part of image preprocessing

See 2aea82f5abc77f9464db8aec0b9fb092320f1d0e for old version of this fix.
*/

interface Props {
  src: string;
  alt: string;
  image: ImageRecord | null;
}

export const BlogImage: React.FC<Props> = ({ src, alt, image }) => {
  const imgElRef = useRef<HTMLImageElement>(null);
  const [isImageloaded, setIsImageloaded] = useState(false);
  const onImgLoaded = useCallback(() => setIsImageloaded(true), []);

  // img immediately accessible (from the start): accessed from cache
  useEffect(() => {
    if (imgElRef.current?.complete) {
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
          className={cx(styles.image)}
          onLoad={onImgLoaded}
        />
      ) : (
        <>
          <span
            className={cx(styles.image, styles.placeholder)}
            style={{
              backgroundImage: `url("${image.placeholder}")`,
              width: image.width,
              aspectRatio: `${image.width} / ${image.height}`,
              opacity: isImageloaded ? 0 : 1,
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
              className={cx(styles.image)}
              style={{
                opacity: isImageloaded ? 1 : 0.01,
              }}
              onLoad={onImgLoaded}
              ref={imgElRef}
            />
          </div>
        </>
      )}
    </Zoom>
  );
};
