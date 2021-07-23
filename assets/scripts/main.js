///////////////////
document.addEventListener("DOMContentLoaded", function () {
  addAnchorsForAllHeadings([".markdown h2", ".markdown h3"]);
  imageZoom();
  enrichTags();
  installThemeToggle();
});

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
// TAGS

/** Adds 'data-tag' attribute to each tag element so we can style using css */
function enrichTags() {
  const tagEls = Array.from(document.getElementsByClassName("tag_item-name"));
  tagEls.forEach((el) => {
    const tagName = el.textContent;
    const value = tagName.split(/\W/).join("_").toLowerCase();
    console.log(value);
    el.setAttribute("data-tag", value);
  });
}

///////////////////
// THEME

function installThemeToggle() {
  const themeToggle = document.querySelector("#theme-toggle");
  themeToggle.addEventListener("click", toggleTheme);
}

function toggleTheme() {
  const isLight = document.documentElement.classList.contains("light-theme");
  setAppTheme(!isLight);
  localStorage.setItem("app-theme", isLight ? "dark-theme" : "light-theme");
}

///////////////////
// IMAGE ZOOM

/** Nicer, medium-like images */
function imageZoom() {
  mediumZoom(document.querySelectorAll(".markdown img"), {
    background: "#20202080",
  });
}
