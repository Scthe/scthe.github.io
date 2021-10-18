import * as React from 'react';
import { Helmet } from 'react-helmet';
import { useStaticQuery, graphql } from 'gatsby';

interface Props {
  title: string;
  description: string;
  isArticle: boolean;
}

// TODO date published
const ldJSON = (title: string, description: string) => ({
  "@context": "http://schema.org",
  "@type": "Article",
  "headline": title,
  "author": {
    "@type": "Person",
    "name": "Marcin Matuszczyk" // TODO from graphql
  },
  "datePublished": "{{ page.date | date_to_xmlschema }}",
  "dateModified": "{{ page.date | date_to_xmlschema }}",
  "description": description,
});

const Seo: React.FC<Props> = ({ title, description, isArticle }) => {
  const { site } = useStaticQuery<GatsbyTypes.SeoQueryQuery>(
    graphql`
      query SeoQuery {
        site {
          siteMetadata {
            title
            description
          }
        }
      }
    `,
  );
  const siteTitle = site.siteMetadata.title;
  const siteDescription = site.siteMetadata.description;
  title = isArticle ? title : siteTitle;
  description = isArticle ? description : siteDescription;

  // TODO finish me!
  const pageUrl = "";
  const pageImageUrl = "";
  const pageTags: string[] = [];

  return (
    <Helmet
      title={title}
      meta={[{
        name: `description`,
        content: description,
      }]}
    >
      {/* Open Graph */}
      <meta property="og:locale" content="en_US" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:site_name" content={siteTitle} />
      {pageImageUrl != null && (
        <>
          <meta name="og:image" content={pageImageUrl} />
          <meta name="twitter:image" content={pageImageUrl} />
        </>
      )}

      {/* Open Graph - article metadata */}
      {isArticle ? (
        <>
          <meta property="og:type" content="article" />
          <meta property="article:author" content="{{ site.url }}" />
          <meta property="article:publisher" content="{{ site.url }}" />
          <meta property="article:published_time" content="{{ page.date | date_to_xmlschema }}" />
          {pageTags.map(tag => (
            <meta property="og:article:tag" content={tag} />
          ))}
        </>
      ) : (
        <meta property="og:type" content="website" />
      )}


      {/* Twitter */}
      {isArticle && (
        <>
          <meta name="twitter:card" content="summary" />
          <meta name="twitter:title" content={title} />
          <meta name="twitter:description" content={description} />
          <meta name="twitter:url" content={pageUrl} />
        </>
      )}

      {/* ld+json */}
      {isArticle && (
        <script type="application/ld+json">
          {JSON.stringify(ldJSON(title, description))}
        </script>
      )}
    </Helmet>
  );
};


export default Seo;
