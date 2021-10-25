export type ArrayItemType<T extends readonly unknown[]> =
  T extends readonly (infer R)[] ? R : never;

const removePrefix = (str: string, prefix: string): string => {
  return str.startsWith(prefix) ? str.substring(prefix.length) : str;
};

export const joinPaths = (...strs: string[]): string => {
  if (strs.length === 0) {
    return '';
  }
  const [start, ...rest] = strs;
  const parts = rest.map((e) => {
    e = e.trim();
    e = removePrefix(e, './');
    return removePrefix(e, '/');
  });
  return [start, ...parts].join('/');
};
