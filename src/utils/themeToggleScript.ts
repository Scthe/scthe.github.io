export const toggleThemeFn = () => {
  const isLight = document.documentElement.classList.contains('light-theme');
  window.setAppTheme(!isLight);
  localStorage.setItem('app-theme', isLight ? 'dark-theme' : 'light-theme');
};
