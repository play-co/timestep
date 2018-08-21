let exports = {};

import { merge } from 'base';

import browser from 'util/browser';
let $ = browser.$;
import Widget from './Widget';

exports = class extends Widget {
  constructor (params) {
    params = merge(params, { tag: 'canvas' });
    this._isEnabled = params.isEnabled;
    super(params);
  }
  create () {
    super.create(...arguments);
  }
  buildWidget () {
    var el = this._el;

    el.width = this._opts.width;
    el.height = this._opts.height;
    if (this._opts.color) {
      el.style.backgroundColor = this._opts.color;
    }

    this.initMouseEvents(el);
    this.initKeyEvents(el);
  }
};
exports.prototype._css = 'cnvs';
exports.prototype._type = 'canvas';
var Canvas = exports;

export default exports;
