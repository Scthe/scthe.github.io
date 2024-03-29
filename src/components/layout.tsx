import * as React from 'react';
import { Helmet } from 'react-helmet';

import { joinPaths, ensureSufix } from '../utils';
import useSiteMeta from '../hooks/useSiteMeta';
import { useFindFileByBase } from '../hooks/useGetFile';
import * as styles from './layout.module.scss';
import TopNav from './topNav';
import Seo, { SeoProps } from './seo';

import '../styles/normalize.module.css';
import '../styles/variables.module.scss';
import '../styles/global.module.scss';
import '../styles/fonts.module.css';
import Footer from './footer';

type Props = React.PropsWithChildren<{
  title: string;
  description: string;
  canonicalUrl: string;
  imagePublicUrl?: string;
  type: SeoProps['type'];
}>;

const Layout: React.FC<Props> = ({
  title,
  description,
  canonicalUrl,
  imagePublicUrl,
  type,
  children,
}) => {
  const siteMeta = useSiteMeta();

  // canonicalUrl
  canonicalUrl = ensureSufix(
    joinPaths(siteMeta.siteUrl || '', canonicalUrl),
    '/',
  );

  // title
  title = ensureTitleHasSiteName(title, siteMeta.title);

  // image
  const defaultSiteImage = useFindFileByBase(siteMeta.defaultImage);
  if (!imagePublicUrl) {
    imagePublicUrl = defaultSiteImage.publicURL!;
  }
  const imageFullPath = joinPaths(siteMeta.siteUrl || '', imagePublicUrl);

  return (
    <>
      <Helmet htmlAttributes={{ lang: 'en' }} title={title}>
        <meta charSet="utf-8" />
        <link rel="canonical" href={canonicalUrl} />

        <meta
          name="viewport"
          content="width=device-width, minimum-scale=1, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#fafafa" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="referrer" content="no-referrer-when-downgrade" />
        <meta name="author" content={siteMeta.author?.name || ''} />
        <meta name="description" content={description} />

        {/* favicon */}
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
      </Helmet>

      <Seo
        title={title}
        description={description}
        image={imageFullPath}
        url={canonicalUrl}
        type={type}
      />

      <div className={styles.heroWrapper}>
        <div />
      </div>

      <TopNav />

      <main className={styles.content}>
        <div className={styles.contentInner}>{children}</div>
      </main>

      <Footer />
    </>
  );
};

export default Layout;

function ensureTitleHasSiteName(
  title: string,
  siteName: string | null,
): string {
  siteName = siteName || '';
  return title.includes(siteName) ? title : `${title} - ${siteName}`;
}
