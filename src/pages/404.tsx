import { Link } from 'gatsby';
import * as React from 'react';

import Layout from '../components/layout';
import PageTitle from '../components/pageTitle';
import * as linkStyles from '../templates/styles/_links.module.scss';

/*
// TODO add links to popular articles here

// TODO GA:
<script>
  document.addEventListener("DOMContentLoaded", function () {
    ga('send', {
      hitType: 'event',
      eventCategory: 'page-404',
      eventAction: 'pageview',
      eventLabel: window.location.href
    });
  });
</script>
*/

const NotFoundPage = () => {
  return (
    <Layout
      title="404: Page not found"
      description="404: Page not found"
      type={{ type: 'website' }}
      canonicalUrl="404"
    >
      <PageTitle
        title="404: Page not found"
        subtitle="Sorry, we can't find that page. It might be an old link or maybe it moved."
      />

      <div
        style={{
          textAlign: 'center',
          marginTop: '2rem',
        }}
      >
        <Link to="/" aria-label="Home page" className={linkStyles.linkStyle}>
          Okay, go home
        </Link>
      </div>
    </Layout>
  );
};

export default NotFoundPage;
