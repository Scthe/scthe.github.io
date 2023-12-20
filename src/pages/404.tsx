import React, { useEffect } from 'react';

import { gaEvent } from '../utils';
import Layout from '../components/layout';
import PageTitle from '../components/pageTitle';
import Link from '../blogPost/components/link';

// TODO [P5] add links to popular articles here

const NotFoundPage = () => {
  useEffect(() => {
    gaEvent('page-404', {
      event_category: 'page-404',
      event_action: 'pageview',
      event_label: window?.location?.href || '-',
      referrer: window?.document?.referrer || '-',
    });
  }, []);

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
        <Link href="/" aria-label="Home page">
          Okay, go home
        </Link>
      </div>
    </Layout>
  );
};

export default NotFoundPage;
