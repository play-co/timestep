let exports = {};

import Button from './Button';
import Widget from './Widget';
import browser from 'util/browser';
let $ = browser.$;

exports = class extends Button {
  buildWidget () {
    var el = this._el;
    $.setText(el, this.getI18n('label') || this.getI18n('text'));

    this.initMouseEvents(el);
    this.initKeyEvents(el);
  }
  setLabel (label) {
    this._opts.label = label;
    if (this._el) {
      $.setText(this._el, label);
    }
  }
};
exports.prototype._type = 'text-button';
var TextButton = exports;

Widget.register(TextButton, 'TextButton');

export default exports;
