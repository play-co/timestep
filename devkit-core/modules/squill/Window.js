let exports = {};

import { merge } from 'base';

import PubSub from 'lib/PubSub';
import uri from 'std/uri';
import browser from 'util/browser';
let $ = browser.$;

var UNIQUE_ID = '__squill__window_id';

exports = class extends PubSub {
  constructor (win) {
    super();

    this._win = win || window;
    this._location = new uri(this._win.location);
    this._dim = $(this._win);
    $.onEvent(this._win, 'resize', this, 'onViewportChange');
    $.onEvent(this._win, 'scroll', this, 'onViewportChange');
  }
  onViewportChange (e) {
    this._dim = $(this._win);
    this.publish('ViewportChange', e, this._dim);
  }
  getViewport () {
    return this._dim;
  }
  query (key) {
    return this._location.query(key);
  }
  hash (key) {
    return this._location.query(key);
  }
  center (el, opts) {
    opts = merge(opts, { subscribe: true });

    var width = 'width' in opts ? opts.width : el.offsetWidth,
      height = 'height' in opts ? opts.height : el.offsetHeight;

    el.style.left = (this._dim.width - width) / 2 + 'px';
    el.style.top = (this._dim.height - height) / 2 + 'px';

    if (opts.subscribe) {
      this.subscribe('ViewportChange', this, 'center', el, merge({ subscribe: false },
        opts));
    }
  }
};
exports.prototype.getDim = exports.prototype.getViewport;
var Window = exports;

var gWin = {};
exports.get = function (win) {
  if (!win) {
    win = window;
  }

  if (win[UNIQUE_ID]) {
    return gWin[win[UNIQUE_ID]];
  } else {
    return gWin[win[UNIQUE_ID]] = new Window(win);
  }
};

export default exports;
