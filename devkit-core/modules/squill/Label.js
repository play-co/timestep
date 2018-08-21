let exports = {};

import browser from 'util/browser';
let $ = browser.$;
import Widget from 'squill/Widget';
import bindings from 'squill/models/bindings';

exports = class extends Widget {
  buildWidget () {
    this.setLabel(this.getI18n('label'));

    var opts = this._opts;
    if (opts.format) {
      bindings.parseFormat(this, opts.format);
    }
  }
  setText (text) {
    $.setText(this._labelSpan, text);
  }
  setHTML (html) {
    this._labelSpan.innerHTML = html;
  }
};

exports.prototype._css = 'label';
exports.prototype._def = {
  children: [{
    id: '_labelSpan',
    tag: 'span'
  }]
};
exports.prototype.setData = exports.prototype.setText;
exports.prototype.setValue = exports.prototype.setText;
exports.prototype.setLabel = exports.prototype.setText;

export default exports;
