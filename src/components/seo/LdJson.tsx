import React from 'react';
import { Helmet } from 'react-helmet';
import { getYear } from 'date-fns';
import { dateToXmlSchema } from '../../utils';

const person = (name: string) => ({ '@type': 'Person', name });
const image = (url: string) => ({ '@type': 'ImageObject', url });

interface LdJsonWebPageProps {
  author: string;
  title: string;
  description: string;
  url: string;
  // datePublished: Date;
  buildTime: Date;
  imageUrl: string;
}

export const LdJsonWebPage = (o: LdJsonWebPageProps) => (
  <LdJson
    data={{
      '@context': 'http://schema.org',
      '@type': 'WebPage',
      url: o.url,
      headline: o.title,
      inLanguage: 'en_US',
      mainEntityOfPage: o.url,
      description: o.description,
      name: o.title,
      author: person(o.author),
      copyrightHolder: person(o.author),
      copyrightYear: '' + getYear(o.buildTime),
      creator: person(o.author),
      publisher: person(o.author),
      datePublished: dateToXmlSchema(o.buildTime),
      dateModified: dateToXmlSchema(o.buildTime),
      image: image(o.imageUrl),
    }}
  />
);

interface LdJsonArticleProps {
  author: string;
  year: number;
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  datePublished: Date;
  dateModified: Date;
}

export const LdJsonArticle = (o: LdJsonArticleProps) => (
  <LdJson
    data={{
      '@context': 'http://schema.org',
      '@type': 'Article',
      name: o.title,
      headline: o.title,
      author: person(o.author),
      copyrightHolder: person(o.author),
      creator: person(o.author),
      copyrightYear: '' + o.year, // '2019',
      datePublished: dateToXmlSchema(o.datePublished),
      dateModified: dateToXmlSchema(o.dateModified),
      description: o.description,
      inLanguage: 'en_US',
      url: o.url,
      mainEntityOfPage: o.url,
      image: image(o.imageUrl),
    }}
  />
);

interface Props {
  data: object;
}

const LdJson = ({ data }: Props) => (
  <Helmet>
    <script type="application/ld+json">{JSON.stringify(data)}</script>
  </Helmet>
);
