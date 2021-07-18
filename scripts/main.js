///////////////////
// HEADER ANCHORS

/** anchors for post's headings */
function addAnchorsForAllHeadings(headingSelectors) {
  anchors.options = {
    placement: "right",
    visible: "always",
    icon: "§",
    class: "content__anchor",
  };

  headingSelectors.forEach((selector) => {
    anchors.add(selector);
  });
}

///////////////////
// THEME

const themeToggle = document.querySelector("#theme-toggle");

themeToggle.addEventListener("click", () => {
  document.body.classList.contains("light-theme")
    ? enableDarkMode()
    : enableLightMode();
});

function enableDarkMode() {
  document.body.classList.remove("light-theme");
  document.body.classList.add("dark-theme");
  themeToggle.setAttribute("aria-label", "Switch to light theme");
}

function enableLightMode() {
  document.body.classList.remove("dark-theme");
  document.body.classList.add("light-theme");
  themeToggle.setAttribute("aria-label", "Switch to dark theme");
}

function setThemePreference() {
  // TODO store in localstorage
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    enableDarkMode();
  } else {
    enableLightMode();
  }
}

///////////////////
///////////////////
document.addEventListener("DOMContentLoaded", function () {
  addAnchorsForAllHeadings([".markdown h2", ".markdown h3"]);
  setThemePreference();
});
