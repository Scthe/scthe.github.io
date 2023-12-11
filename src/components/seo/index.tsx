import * as React from 'react';
import { Helmet } from 'react-helmet';
import { getYear } from 'date-fns';

import useSiteMeta from '../../hooks/useSiteMeta';
import { dateToXmlSchema, maybeNull2Undefined } from '../../utils';
import Facebook from './Facebook';
import Twitter from './Twitter';
import { LdJsonWebPage, LdJsonArticle } from './LdJson';

interface ArticleType {
  type: 'article';
  datePublished: Date;
  dateModified: Date;
}

interface WebsiteType {
  type: 'website';
}

export interface SeoProps {
  title: string;
  description: string;
  image: string;
  url: string;
  type: ArticleType | WebsiteType;
}

const Seo: React.FC<SeoProps> = ({ title, description, image, url, type }) => {
  const siteMeta = useSiteMeta();
  const author = siteMeta.author?.name || '';
  // fb's: article:author, article:publisher
  const myPageUrl = maybeNull2Undefined(siteMeta.siteUrl);

  return (
    <>
      <Facebook
        url={url}
        siteName={siteMeta.title || ''}
        type={type.type}
        title={title}
        desc={description}
        image={image}
      />
      <Twitter
        type="summary"
        // username=""
        title={title}
        desc={description}
        image={image}
        pageUrl={url}
      />

      {type.type === 'article' && (
        <Helmet
          meta={[
            { property: 'article:author', content: myPageUrl },
            { property: 'article:publisher', content: myPageUrl },
            {
              property: 'article:published_time',
              content: dateToXmlSchema(type.datePublished),
            },
          ]}
        />
      )}

      {type.type === 'article' ? (
        <LdJsonArticle
          title={title}
          description={description}
          author={author}
          url={url}
          imageUrl={image}
          year={getYear(type.datePublished)}
          datePublished={type.datePublished}
          dateModified={type.dateModified}
        />
      ) : (
        <LdJsonWebPage
          author={author}
          title={title}
          description={description}
          url={url}
          // datePublished,
          buildTime={new Date()}
          imageUrl={image}
        />
      )}
    </>
  );
};

export default Seo;
