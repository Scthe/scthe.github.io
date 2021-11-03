import { useStaticQuery, graphql } from 'gatsby';
import { ArrayItemType, removePrefix } from '../utils';

type NodeArray = GatsbyTypes.FilesQuery['allFile']['nodes'];
type ReturnType = ArrayItemType<NodeArray>;

export default function useGetFile(base: string): ReturnType {
  base = removePrefix(base, './');
  base = removePrefix(base, '/');

  const { allFile } = useStaticQuery<GatsbyTypes.FilesQuery>(
    graphql`
      query Files {
        allFile {
          nodes {
            absolutePath
            publicURL
            name
            extension
            ext
            dir
            base
          }
        }
      }
    `,
  );

  const nodes = allFile.nodes.filter((e) => e.base === base);

  if (nodes.length === 0) {
    const allImages = allFile.nodes.map((e) => e.base);
    console.error('Available files:', allImages);
    throw new Error(`useGetFile could not find file base='${base}'`);
  }

  const publicUrls = nodes.map((e) => e.publicURL);
  const uniquePublicUrls = new Set(publicUrls);
  if (uniquePublicUrls.size > 1) {
    const found = nodes.map((e) => e.absolutePath);
    throw new Error(
      `useGetFile found many files with base='${base}': [${found.join(', ')}]`,
    );
  }

  return nodes[0] as any;
}
