function exists (a) {
  var args = Array.prototype.slice.call(arguments),
    ok = args.length > 0;

  forEach(args, function (_, item) {
    ok = ok && e(item);
  });

  return ok;

  function e (item) {
    return item !== undefined && item !== null;
  }
}

function forEach (arr, cb) {
  for (var i = 0; i < arr.length; i++) {
    cb(i, arr[i]);
  }
}

function addListener (evType, el, cb) {
  if (!exists(el)) {
    return;
  }

  el['on' + evType] = cb;
}

/** anchors for post's headings */
function addAnchorsForAllHeadings (headingSelectors) {
  anchors.options = {
      placement: 'right',
      visible: 'always',
      icon: '§',
      class: 'content__anchor'
  };

  forEach(headingSelectors, function (_, selector) {
    anchors.add(selector);
  });
}

function createModalController (classes) {
  var modalEl = document.getElementsByClassName(classes.modal)[0],
      modalContentEl = document.getElementsByClassName(classes.content)[0],
      closeBtnEl = document.getElementsByClassName(classes.closeBtn)[0],
      overlayEl = document.getElementsByClassName(classes.overlay)[0];

  if (!exists(modalEl, modalContentEl, closeBtnEl, overlayEl)) {
    console.error('Could not find modal element, modals will not work');
    return;
  }

  addListener('click', closeBtnEl, hide);
  addListener('click', overlayEl, hide);

  return {
    show: show,
    hide: hide,
    replaceContent: replaceContent
  };

  function show () {
    modalEl.style.display = "block";
  }

  function hide () {
    modalEl.style.display = "none";
  }

  function replaceContent (newEl) {
    if (!exists(newEl)) {
      console.error('Could not replace modal content with: ', newEl);
      return;
    }

    modalContentEl.innerHTML = '';
    modalContentEl.appendChild(newEl);
  }
}

function addImageDialogHandlers (modalController, postImagesSelector) {
  var ATTRS_TO_COPY = ['alt', 'src', 'class'];
  var MODAL_IMAGE_CLASSNAME = 'modal__content__image';

  var postImageEls = document.querySelectorAll(postImagesSelector);
  forEach(postImageEls, function (_, imgEl) {
    addListener('click', imgEl, createImageModalCallback(imgEl));
  });

  function createImageModalCallback (imgEl) {
    var modalContentImg = copyImgEl(imgEl);

    return function () {
      modalController.replaceContent(modalContentImg);
      modalController.show();
    }
  }

  function copyImgEl (srcEl) {
    var modalContentImg = document.createElement('img');

    forEach(ATTRS_TO_COPY, function (_, attrName) {
      var attrVal = srcEl.getAttribute(attrName) || srcEl[attrName];
      modalContentImg.setAttribute(attrName, attrVal);
    });

    modalContentImg.className += ' ' + MODAL_IMAGE_CLASSNAME;

    return modalContentImg;
  }
}

document.addEventListener('DOMContentLoaded', function() {
  addAnchorsForAllHeadings([
    '.post h2',
    '.post h3'
  ]);

  var modalController = createModalController({
    modal: 'modal__portal',
    content: 'modal__content',
    closeBtn: 'modal__close-btn',
    overlay: 'modal__overlay'
  });

  if (modalController) {
    addImageDialogHandlers(modalController, '.post img');
  }
});
