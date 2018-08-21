let exports = {};

import {
  merge,
  bind
} from 'base';

import browser from 'util/browser';
let $ = browser.$;
import Widget from './Widget';

import jscolor from './jscolor/jscolor';

exports = class extends Widget {
  constructor (params) {
    params = merge(params, { tag: 'input' });
    this._isEnabled = params.isEnabled;

    super(params);
  }
  buildWidget () {
    var el = this._el;

    $.addClass(el, 'squill-color');
    el.min = this._opts.min || 0;
    el.max = this._opts.max || 100;
    el.step = this._opts.step || 1;
    el.value = this._opts.value || 0;
    el.onchange = bind(this, this._onChange);

    jscolor.bind(el);
  }
  setValue (value) {
    if (value) {
      if (value[0] !== '#') {
        value = '#' + value;
      }
      this._el.style.backgroundColor = value;

      value = value.substr(1, 6);
    }
    this._el.value = value;
  }
  getValue () {
    return this._el.value;
  }
  _onChange () {
    this.publish('Change', this._el.value);
  }
};
exports.prototype._css = 'clr';
exports.prototype._type = 'text';
var Color = exports;

export default exports;
