import { format, formatISO, parseISO } from 'date-fns';

export type Maybe<T> = T | undefined | null;

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

/**
 * The route slug for a permalink. `src/pages/blog/[...slug]` already owns the
 * `/blog/` prefix, so `/blog/md-test/` -> `md-test`.
 */
export const slugFromPermalink = (permalink: string): string => {
  const path = permalink.replace(/^\/+/, '').replace(/\/+$/, '');
  return path.split('/').slice(1).join('/');
};

// TODO [migration] test
export const gaEvent = (
  eventName: string,
  params: Gtag.ControlParams | Gtag.EventParams | Gtag.CustomParams,
) => {
  const isProdBuild = import.meta.env.PROD;

  if (typeof window !== 'undefined' && isProdBuild) {
    const gtag = (window as { gtag?: (...args: unknown[]) => void }).gtag;
    if (typeof gtag === 'function') {
      gtag('event', eventName, params);
    }
  }
};

/// DATES

export const parseDate = (date: string): Date => parseISO(date);

export const dateToXmlSchema = (date: Date): string => formatISO(date);

export const dateFmt = (date: Date): string => format(date, 'dd MMM yyyy');
