import { formatISO, format, parseISO } from 'date-fns';

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

/// DATES

export const parseDate = (date: string): Date => parseISO(date);

export const dateToXmlSchema = (date: Date): string => formatISO(date);

export const dateFmt = (date: Date): string => format(date, 'dd MMM yyyy');
