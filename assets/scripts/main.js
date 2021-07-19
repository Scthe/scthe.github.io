///////////////////
document.addEventListener("DOMContentLoaded", function () {
  addAnchorsForAllHeadings([".markdown h2", ".markdown h3"]);
  imageZoom();
  enrichTags();
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

const themeToggle = document.querySelector("#theme-toggle");

themeToggle.addEventListener("click", () => {
  document.body.classList.contains("light-theme")
    ? enableDarkMode()
    : enableLightMode();
});

function enableDarkMode() {
  document.body.classList.remove("light-theme");
  document.body.classList.add("dark-theme");
  localStorage.setItem("app-theme", "dark-theme");
}

function enableLightMode() {
  document.body.classList.remove("dark-theme");
  document.body.classList.add("light-theme");
  localStorage.setItem("app-theme", "light-theme");
}

///////////////////
// IMAGE ZOOM

/** Nicer, medium-like images */
function imageZoom() {
  mediumZoom(document.querySelectorAll(".markdown img"), {
    background: "#20202080",
  });
}
