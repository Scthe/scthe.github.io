import { useStaticQuery, graphql } from 'gatsby';
import { ArrayItemType, removePrefix } from '../utils';

type Query = GatsbyTypes.UseFindFileByBaseQuery;
type NodeArray = Query['allFile']['nodes'];
type FileType = ArrayItemType<NodeArray>;

export function useFindFileByBase(base: string | null): FileType {
  if (base == null) {
    throw new Error('useFindFileByBase(): Called with null');
  }
  base = removePrefix(base, './');
  base = removePrefix(base, '/');

  const { allFile } = useStaticQuery<Query>(graphql`
    query UseFindFileByBase {
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
  `);

  const nodes = allFile.nodes.filter((e) => e.base === base);

  ensureHasItems(nodes, `useFindFileByBase('${base}')`);
  ensureHasSingleItem(nodes, `useFindFileByBase('${base}')`);

  return nodes[0] as any;
}

function ensureHasItems(files: FileType[], errMsg: string) {
  if (files.length === 0) {
    throw new Error(`Found 0 items: ${errMsg}`);
  }
}

function ensureHasSingleItem(files: FileType[], errMsg: string) {
  const publicUrls = files.map((e) => e.publicURL);
  const uniquePublicUrls = new Set(publicUrls);

  if (uniquePublicUrls.size > 1) {
    console.warn('Matching files:', files);
    throw new Error(
      `Found ${uniquePublicUrls.size} items, expected 1: ${errMsg}`,
    );
  }
}
