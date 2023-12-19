import { useStaticQuery, graphql } from 'gatsby';
import { ArrayItemType, getAbsolutePath } from '../utils';

type Query = GatsbyTypes.UseGetStaticImageDataQuery;
type NodeArray = Query['allImageSharp']['nodes'];
type ReturnType = ArrayItemType<NodeArray>;

export default function useGetStaticImageData(
  filePath: string,
): ReturnType | undefined {
  const { allImageSharp } = useStaticQuery<Query>(graphql`
    query UseGetStaticImageData {
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
  `);

  const node = findImageByAbsolutePath(allImageSharp.nodes, filePath);

  if (node == null) {
    const allImages = allImageSharp.nodes.map((e) => getAbsolutePath(e.parent));
    console.warn('Available images:', allImages);
    throw new Error(`useGetStaticImageData could not find image '${filePath}'`);
  }

  return node;
}

function findImageByAbsolutePath(
  nodes: NodeArray,
  filePath: string,
): ReturnType | undefined {
  filePath = filePath.toLowerCase();
  return nodes.find((e) => {
    const absolutePath = getAbsolutePath(e.parent) || '';
    return absolutePath.toLowerCase().endsWith(filePath);
  });
}
