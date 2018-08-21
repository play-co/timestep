let exports = {};

import { bind } from 'base';

import browser from 'util/browser';
let $ = browser.$;

var hint = $({
  parent: document.body,
  className: 'hint'
});

exports.show = function (x, y, text) {
  hint.innerHTML = text;
  hint.style.left = x + 'px';
  hint.style.top = y + 'px';
  hint.style.display = 'block';

  console.log(text);
  if (x + hint.offsetWidth >= document.width) {
    hint.style.left = x - hint.offsetWidth + 'px';
  }
};

exports.hide = function () {
  hint = hint || $({
    parent: document.body,
    className: 'graphHint'
  });

  hint.style.display = 'none';
};

var setHintTimeout = function (evt) {
  evt.target.hintTimeout && clearTimeout(evt.target.hintTimeout);
  evt.target.hintTimeout = setTimeout(bind(this, function () {
    exports.show(evt.pageX + 12, evt.pageY + 14, evt.target.hintText);
  }), 300);
};

exports.add = function (el, text) {
  el.hintText = text;

  $.onEvent(el, 'mouseover', setHintTimeout);
  $.onEvent(el, 'mousemove', setHintTimeout);
  $.onEvent(el, 'mouseout', function (evt) {
    exports.hide();
    evt.target.hintTimeout && clearTimeout(evt.target.hintTimeout);
  });
};

export default exports;
