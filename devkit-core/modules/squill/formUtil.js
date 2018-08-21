let exports = {};

import { bind } from 'base';

import browser from 'util/browser';
let $ = browser.$;

exports.onEnter = function (el, cb) {
  if (arguments.length > 2) {
    cb = bind.apply(this, Array.prototype.slice.call(arguments, 1));
  }




  $.onEvent(el.getElement && el.getElement() || el, 'keypress', function (evt) {
    if (evt.keyCode == 13) {
      cb();
    }
  });
};

exports.focus = function (el) {
  $.id(el.getElement && el.getElement() || el).focus();
};

exports.onPress = function (el, cb) {
  if (arguments.length > 2) {
    cb = bind.apply(this, Array.prototype.slice.call(arguments, 1));
  }




  $.onEvent(el.getElement && el.getElement() || el, 'click', function (evt) {
    $.stopEvent(evt);
    cb();
  });
};

export default exports;
