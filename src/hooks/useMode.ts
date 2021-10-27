/** Forbids compile time optimalizations, but we are mostly static site, so... */
export function useMode(): 'development' | 'production' {
  const mode = process.env.NODE_ENV;
  return mode === 'production' ? 'production' : 'development';
}
