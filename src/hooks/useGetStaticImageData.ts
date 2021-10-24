import { useStaticQuery, graphql } from 'gatsby';

type ArrayItemType<T> = T extends Array<infer R> ? R : T;

type ImageData = ArrayItemType<
  GatsbyTypes.AllStaticImagesQuery['allImageSharp']['nodes']
>;

export default function useGetStaticImageData(
  filePath: string,
): ImageData | undefined {
  const { allImageSharp } = useStaticQuery<GatsbyTypes.AllStaticImagesQuery>(
    graphql`
      query AllStaticImages {
        allImageSharp(filter: {}) {
          nodes {
            original {
              width
              src
              height
            }
            parent {
              ... on File {
                absolutePath
              }
            }
            gatsbyImageData
          }
        }
      }
    `,
  );
  filePath = filePath.toLowerCase();
  const node = allImageSharp.nodes.find((e) => {
    const absolutePath = e.parent?.absolutePath || '';
    return absolutePath.toLowerCase().endsWith(filePath);
  });

  return node as any;
}
