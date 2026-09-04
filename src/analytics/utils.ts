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
