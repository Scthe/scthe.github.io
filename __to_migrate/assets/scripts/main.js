///////////////////
document.addEventListener('DOMContentLoaded', function () {
  addAnchorsForAllHeadings(['.markdown h2', '.markdown h3']);
  imageZoom();
  enrichTags();
});

///////////////////
// HEADER ANCHORS

/** anchors for post's headings */
function addAnchorsForAllHeadings(headingSelectors) {
  anchors.options = {
    placement: 'right',
    visible: 'always',
    icon: '§',
    class: 'content__anchor',
    ariaLabel: 'Create permalink',
  };

  headingSelectors.forEach((selector) => {
    anchors.add(selector);
  });
  // remove from focus flow and text reader
  Array.from(document.querySelectorAll('.content__anchor')).forEach((el) => {
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('tabindex', '-1');
    const headingText = el.previousSibling.textContent;
    el.setAttribute('aria-label', headingText + ' permalink');
  });
}

///////////////////
// TAGS

function slugify(text) {
  return text.split(/\W/).join('_').toLowerCase();
}

/** Adds 'data-tag' attribute to each tag element so we can style using css */
function enrichTags() {
  const tagEls = Array.from(document.getElementsByClassName('tag_item-name'));
  tagEls.forEach((el) => {
    const tagName = el.textContent;
    el.setAttribute('data-tag', slugify(tagName));
  });
}

///////////////////
// IMAGE ZOOM
// TODO try accessibility using pseudo element?

/** Nicer, medium-like images */
function imageZoom() {
  // Let's assume user does not need close button and will just TAB-away..
  const zoom = mediumZoom(document.querySelectorAll('.markdown img'), {
    background: '#20202080',
  });

  const lightboxLinks = Array.from(
    document.querySelectorAll('.lazyimage-lightbox_link'),
  );
  lightboxLinks.forEach((linkEl) => {
    const imgEl = linkEl.querySelector('img');
    linkEl.addEventListener('click', (e) => {
      e.preventDefault();
      zoom.open(imgEl);
    });
  });

  // Terrible abuse, but medium-zoon does not allow for anything better
  const alertAnouncer = document.getElementById('image-zoom-alert');
  zoom.on('opened', (event) => {
    alertAnouncer.textContent =
      'This is a dialog window which overlays the main content of the page. The modal shows the enlarged image. Pressing the Escape key will close the modal and bring you back to where you were on the page.';
  });

  zoom.on('closed', (event) => {
    alertAnouncer.textContent = '';
    event.target.focus();
  });
}
