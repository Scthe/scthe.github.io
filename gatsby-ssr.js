const React = require(`react`);

const PageThemeScriptTag = () => {
  const codeToRunOnClient = `
(function() {
  window.setAppTheme = setAppTheme;
  const THEME_LIGHT_BG = "#fafafa";
  const THEME_DARK_BG = "#353535";

  // https://github.com/Scthe/ai-prompt-editor/blob/master/static/index.html
  const osThemeDark = Boolean(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const storageThemeColor = localStorage.getItem('app-theme');
  const storageThemeDark = storageThemeColor === 'dark-theme';
  const isDarkTheme =
    storageThemeColor !== undefined // has value, so decided by local storage
      ? storageThemeColor === 'dark-theme'
      : osThemeDark;
  setAppTheme(!isDarkTheme);

  function setAppTheme(isLightTheme) {
    const el = document.documentElement;

    if (isLightTheme) {
      el.classList.remove("dark-theme");
      el.classList.add("light-theme");
      setMetaTheme(THEME_LIGHT_BG);
    } else {
      el.classList.remove("light-theme");
      el.classList.add("dark-theme");
      setMetaTheme(THEME_DARK_BG);
    }

    localStorage.setItem(
      'app-theme',
      isLightTheme ? 'light-theme' : 'dark-theme'
    );
  }

  function setMetaTheme(color) {
    let el = document.querySelector('meta[name="theme-color"]');
    if (el == null) {
      el = document.createElement("meta");
      el.setAttribute("name", "theme-color");
      document.head.appendChild(el);
    }
    el.setAttribute("content", color);
  }
})()`;

  // eslint-disable-next-line react/no-danger
  return <script dangerouslySetInnerHTML={{ __html: codeToRunOnClient }} />;
};

// eslint-disable-next-line import/no-unused-modules
export const onRenderBody = ({ setPreBodyComponents }) => {
  setPreBodyComponents(<PageThemeScriptTag key="PageThemeScriptTag" />);
};
