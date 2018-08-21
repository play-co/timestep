let exports = {};

import PubSub from 'lib/PubSub';
import browser from 'util/browser';
let $ = browser.$;

exports = class extends PubSub {
  constructor (opts) {
    super();

    this._opts = JS.merge(opts, {
      win: window,
      tag: 'div'
    });
  }
  build () {
    if (!this._el) {
      if (this._opts.el) {
        this._el = this._opts.el;
        $.apply(this._el, this._opts);
      } else {
        this._el = $.create(this._opts);
      }

      this.buildContent();
    }

    return this;
  }
  getId () {
    return this._el && this._el.id || this._opts && this._opts.id;
  }
  buildContent () {}
  destroy () {
    if (!this._el) {
      return;
    }
  }
  getElement () {
    return this._el || this.build()._el;
  }
  appendChild (el) {
    if (!this._el) {
      this.build();
    }
    this._el.appendChild(el instanceof Element ? el._el : el);

    return this;
  }
  appendTo (el) {
    if (!this._el) {
      this.build();
    }

    if (el instanceof Element) {
      el.appendChild(this);
    } else {
      el.appendChild(this._el);
    }

    return this;
  }
  setPos (x, y) {
    this._el.style.x = x + 'px';
    this._el.style.y = y + 'px';
  }
  center () {
    var dim = $(window);
    this.setPos(Math.max(0, dim.width - this._el.offsetWidth) / 2, Math.max(
      0, dim.height - this._el.offsetHeight) / 2);
  }
  remove () {
    $.remove(this._el);
  }
};
var Element = exports;

export default exports;
