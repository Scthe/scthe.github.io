import React from 'react';
import { Helmet } from 'react-helmet';

interface Props {
  type: 'summary_large_image' | 'summary';
  username?: string;
  title: string;
  desc: string;
  image: string;
  pageUrl: string;
}

const Twitter = ({ type, username, title, desc, image, pageUrl }: Props) => (
  <Helmet>
    {username && <meta name="twitter:creator" content={username} />}
    <meta name="twitter:card" content={type} />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={desc} />
    <meta name="twitter:image" content={image} />
    <meta name="twitter:image:alt" content={desc} />
    <meta name="twitter:url" content={pageUrl} />
  </Helmet>
);

export default Twitter;
