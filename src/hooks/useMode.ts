export type BuildMode = 'development' | 'production';

/** Forbids compile time optimalizations, but we are mostly static site, so... */
export function useMode(): BuildMode {
  const mode = process.env.NODE_ENV;
  return mode === 'production' ? 'production' : 'development';
}
