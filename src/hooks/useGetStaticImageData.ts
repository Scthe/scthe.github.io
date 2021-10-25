import { useStaticQuery, graphql } from 'gatsby';
import { ArrayItemType } from '../utils';

type NodeArray = GatsbyTypes.AllStaticImagesQuery['allImageSharp']['nodes'];
type ReturnType = ArrayItemType<NodeArray>;

export default function useGetStaticImageData(filePath: string): ReturnType {
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

  if (node == null) {
    const allImages = allImageSharp.nodes.map((e) => e.parent?.absolutePath);
    console.error('Available images:', allImages);
    throw new Error(`useGetStaticImageData could not find image '${filePath}'`);
  }

  return node as any;
}
