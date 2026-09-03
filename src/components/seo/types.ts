export interface ArticleType {
  type: 'article';
  datePublished: Date;
  dateModified: Date;
}

export interface WebsiteType {
  type: 'website';
}

export type SeoProps = {
  title: string;
  description: string;
  image: string;
  url: string;
  type: ArticleType | WebsiteType;
};