import { formatISO, format, parseISO } from 'date-fns';
import { useMode } from '../hooks/useMode';
import filterDraftPosts from './filterDraftPosts';

export type ArrayItemType<T extends readonly unknown[]> =
  T extends readonly (infer R)[] ? R : never;

export type EnsureDefined<T> = T extends undefined | null ? never : T;

export const removePrefix = (str: string, prefix: string): string => {
  return str.startsWith(prefix) ? str.substring(prefix.length) : str;
};

const removeSufix = (str: string, suffix: string): string => {
  return str.endsWith(suffix)
    ? str.substring(0, str.length - suffix.length)
    : str;
};

export const ensureSufix = (str: string, suf: string) =>
  str.endsWith(suf) ? str : `${str}${suf}`;

export const joinPaths = (...strs: string[]): string => {
  if (strs.length === 0) {
    return '';
  }
  const [start, ...rest] = strs;
  const parts = rest.map((e) => {
    e = e.trim();
    e = removeSufix(e, '/');
    e = removePrefix(e, './');
    return removePrefix(e, '/');
  });
  return [removeSufix(start.trim(), '/'), ...parts].join('/');
};

export const gaEvent = (
  eventName: string,
  params: Gtag.ControlParams | Gtag.EventParams | Gtag.CustomParams,
) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const mode = useMode();
  if (mode === 'production') {
    typeof window !== 'undefined' && window.gtag('event', eventName, params);
  }
};

export const getAbsolutePath = (
  // eslint-disable-next-line @typescript-eslint/ban-types
  parent: { readonly absolutePath: string } | {} | null,
): string | null => {
  return parent && 'absolutePath' in parent ? parent.absolutePath : null;
};

export const getRelativeDirectory = (
  // eslint-disable-next-line @typescript-eslint/ban-types
  parent: { readonly relativeDirectory: string } | {} | null,
): string | null => {
  return parent && 'relativeDirectory' in parent
    ? parent.relativeDirectory
    : null;
};

export const maybeNull2Undefined = <T>(x: T | null): T | undefined => {
  return x != null ? x : undefined;
};

type DraftablePostFm = { readonly draft: boolean | null };
type DraftablePost = { readonly frontmatter: DraftablePostFm | null };

/** Typesafe `filterDraftPosts()` */
export function filterDraftPostsTS<T extends DraftablePost>(
  a0: readonly T[],
  a1: boolean,
): T[] {
  return filterDraftPosts(a0, a1);
}

/// DATES

export const parseDate = (date: string): Date => parseISO(date);

export const dateToXmlSchema = (date: Date): string => formatISO(date);

export const dateFmt = (date: Date): string => format(date, 'dd MMM yyyy');
