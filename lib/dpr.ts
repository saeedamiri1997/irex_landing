export function watchDevicePixelRatio(onChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};

  let mediaQuery: MediaQueryList | null = null;

  const subscribe = () => {
    const dpr = window.devicePixelRatio || 1;
    mediaQuery = window.matchMedia(`(resolution: ${dpr}dppx)`);
    mediaQuery.addEventListener('change', handleChange);
  };

  const handleChange = () => {
    mediaQuery?.removeEventListener('change', handleChange);
    mediaQuery = null;
    onChange();
    subscribe();
  };

  subscribe();

  return () => {
    mediaQuery?.removeEventListener('change', handleChange);
    mediaQuery = null;
  };
}
