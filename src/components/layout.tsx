import * as React from 'react';
import { Helmet } from 'react-helmet';
import * as styles from "./layout.module.scss";

import "../styles/normalize.module.css";
import "../styles/variables.module.scss";
import "../styles/global.module.scss";
import "../styles/fonts.module.css";

interface Props {
  title: string;
}

const Layout: React.FC<Props> = ({ title, children }) => {
  // const { site } = useStaticQuery<GatsbyTypes.LayoutQueryQuery>(
  //   graphql`
  //     query LayoutQuery {
  //       site {
  //         siteMetadata {
  //           title
  //           description
  //         }
  //       }
  //     }
  //   `,
  // );

  // TODO SEO here
  // TODO title, description
  // TODO dark mode
  return (
    <>
      <Helmet
        htmlAttributes={{ lang: "en" }}
        title={title}
      >
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, minimum-scale=1, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#fafafa" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="referrer" content="no-referrer-when-downgrade" />
        <meta name="author" content="Marcin Matuszczyk" />
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" />

        {/* favicon */}
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
      </Helmet>

      {/* TODO DARK MODE */}

      <div className={styles.heroWrapper}>
        <div />
      </div>

      {/* TODO include top_nav.html - PageNav */}

      <main className={styles.content}>
        <div className={styles.contentInner}>
          {children}
        </div>
      </main>

      <footer className={styles.footer}>
        <div>Thanks for reading!</div>
        <div className={styles.footerCopyright}>
          Content and illustrations © 2021 Marcin Matuszczyk. All Rights Reserved.
        </div>
      </footer>

      {/* TODO Scripts */}
      {/*
      <script src="{{ site.baseurl }}/assets/scripts/anchor-js/anchor.min.js"></script>
      <script src="{{ site.baseurl }}/assets/scripts/medium-zoom/medium-zoom.min.js"></script>
      <script src="{{ site.baseurl }}/assets/scripts/main.js"></script>
      <!-- Use CDN as mathjax has many runtime dependencies. Don't even bother.. -->
      <script async src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.7/MathJax.js?config=TeX-MML-AM_CHTML">
      </script>
       */}

      {/* include analytics.html */}
    </>
  );
};

export default Layout;
