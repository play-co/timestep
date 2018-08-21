let exports = {};

import Widget from 'squill/Widget';
import bindings from 'squill/models/bindings';

exports = class extends Widget {
  buildWidget () {
    var opts = this._opts;
    if (opts.format) {
      bindings.parseFormat(this, opts.format);
    }
  }
  set src (src) {
    this._el.src = src;
  }
  get src () {
    return this._el.src;
  }
  setSrc (src) {
    this.src = src;
  }
};

exports.prototype._css = 'image';
exports.prototype._def = { tag: 'img' };
exports.prototype.setData = exports.prototype.setSrc;
export default exports;
