import React from 'react';
import { Helmet } from 'react-helmet';

interface Props {
  url: string;
  siteName: string;
  type: 'article' | 'website';
  title: string;
  desc: string;
  image: string;
}

const Facebook = ({ url, siteName, type, title, desc, image }: Props) => (
  <Helmet>
    <meta property="og:site_name" content={siteName} />
    <meta property="og:locale" content="en_US" />
    <meta property="og:url" content={url} />
    <meta property="og:type" content={type} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={desc} />
    <meta property="og:image" content={image} />
    <meta property="og:image:alt" content={desc} />
  </Helmet>
);

export default Facebook;
