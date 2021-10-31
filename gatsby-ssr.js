const React = require(`react`);

const PageThemeScriptTag = () => {
  const codeToRunOnClient = `
(function() {
  window.setAppTheme = setAppTheme;
  const THEME_LIGHT_BG = "#fafafa";
  const THEME_DARK_BG = "#353535";

  let isLight = !window.matchMedia("(prefers-color-scheme: dark)").matches;
  const storageThemeColor = localStorage.getItem("app-theme");
  if (storageThemeColor === "dark-theme") {
    isLight = false;
  }
  setAppTheme(isLight);

  function setAppTheme(nextIsLight) {
    const el = document.documentElement;
    if (nextIsLight) {
      el.classList.remove("dark-theme");
      el.classList.add("light-theme");
      setMetaTheme(THEME_LIGHT_BG);
    } else {
      el.classList.remove("light-theme");
      el.classList.add("dark-theme");
      setMetaTheme(THEME_DARK_BG);
    }
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
