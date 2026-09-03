export type BuildMode = 'development' | 'production';

/** Forbids compile time optimalizations, but we are mostly static site, so... */
export function useMode(): BuildMode {
  return import.meta.env.DEV ? 'development' : 'production';
}
