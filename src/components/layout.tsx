import * as React from 'react';
import { Helmet } from 'react-helmet';

import { joinPaths, ensureSufix } from '../utils';
import useSiteMeta from '../hooks/useSiteMeta';
import useGetFile from '../hooks/useGetFile';
import themeToggleScript from '../utils/themeToggleScript';
import * as styles from './layout.module.scss';
import TopNav from './topNav';
import Seo, { SeoProps } from './seo';

import '../styles/normalize.module.css';
import '../styles/variables.module.scss';
import '../styles/global.module.scss';
import '../styles/fonts.module.css';

const THEME_TOGGLE_SCRIPT_EL = {
  type: 'text/javascript',
  innerHTML: themeToggleScript,
};

interface Props {
  title: string;
  description: string;
  canonicalUrl: string;
  image?: string;
  type: SeoProps['type'];
}

const Layout: React.FC<Props> = ({
  title,
  description,
  canonicalUrl,
  image,
  type,
  children,
}) => {
  const siteMeta = useSiteMeta();
  canonicalUrl = ensureSufix(
    joinPaths(siteMeta.siteUrl || '', canonicalUrl),
    '/',
  );
  const imageBase = image || siteMeta.defaultImage!;
  const imagePublicUrl = useGetFile(imageBase).publicURL!;
  image = joinPaths(siteMeta.siteUrl || '', imagePublicUrl);

  return (
    <>
      <Helmet
        htmlAttributes={{ lang: 'en' }}
        title={title}
        script={[THEME_TOGGLE_SCRIPT_EL]}
        meta={[
          {
            name: 'viewport',
            content:
              'width=device-width, minimum-scale=1, initial-scale=1, viewport-fit=cover',
          },
          { name: 'theme-color', content: '#fafafa' },
          { name: 'mobile-web-app-capable', content: 'yes' },
          { name: 'apple-mobile-web-app-capable', content: 'yes' },
          { name: 'referrer', content: 'no-referrer-when-downgrade' },
          { name: 'author', content: siteMeta.author?.name || '' },
          { name: 'description', content: description },
          { name: 'theme-color', content: '#fafafa' },
        ]}
      >
        <meta charSet="utf-8" />
        <link rel="canonical" href={canonicalUrl} />

        {/* favicon */}
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
      </Helmet>

      <Seo
        title={title}
        description={description}
        image={image}
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

      <footer className={styles.footer}>
        <div>Thanks for reading!</div>
        <div className={styles.footerCopyright}>
          Content and illustrations © 2021 Marcin Matuszczyk. All Rights
          Reserved.
        </div>
      </footer>

      {/* TODO include analytics.html */}
    </>
  );
};

export default Layout;
