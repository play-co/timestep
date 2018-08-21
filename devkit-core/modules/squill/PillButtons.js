let exports = {};

import { merge } from 'base';

import Widget from './Widget';
import browser from 'util/browser';
let $ = browser.$;

var defaults = { className: 'pillButtons' };

exports = class extends Widget {
  constructor (opts) {
    opts = merge(opts, defaults);
    super(opts);
  }
  buildWidget (el) {
    this._options = {};

    var opts = this._opts.options,
      len = opts.length;
    for (var i = 0; i < len; ++i) {
      var optionEl = $({
        text: opts[i].text,
        className: 'pillBtnSegment',
        parent: el
      });

      if (opts[i].selected) {
        $.addClass(optionEl, 'selected');
        this._selected = {
          optionEl: optionEl,
          value: opts[i].value
        };
      }

      $.onEvent(optionEl, 'mousedown', this, 'onSelect', optionEl, opts[i].value);
      this._options[opts[i].value] = optionEl;
    }
  }
  setValue (value) {
    this.onSelect(this._options[value], value);
  }
  onSelect (optionEl, value, evt) {
    if (value === this._selected.value) {
      return;
    }

    $.removeClass(this._selected.optionEl, 'selected');
    $.addClass(optionEl, 'selected');

    this._selected = {
      optionEl: optionEl,
      value: value
    };

    this.publish('Select', value);
  }
};
var PillButtons = exports;

export default exports;
