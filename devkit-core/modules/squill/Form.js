let exports = {};

import {
  merge,
  bind,
  logger
} from 'base';

import Element from './Element';
import Widget from './Widget';

exports = class extends Widget {
  constructor (opts) {
    opts = merge(opts, {});
    super(opts);

    this._items = [];
    if (opts.items) {
      this.addItems(opts.items);
    }
  }
  buildContent () {
    this.each(bind(this, function (item) {
      if ($.isElement(item)) {
        this._el.appendChild(item);
      } else {
        item.appendTo(this._el);
      }
    }));
  }
  validate () {
    this.each(bind(this, function (item) {
      if (item.isValid) {
        if (!item.isValid()) {
          this.isValid = false;
        }
      }
    }));
    return this.isValid;
  }
  each (cb) {
    for (var i = 0, w; w = this._items[i]; ++i) {
      cb(w);
    }
  }

  addItems (items) {
    for (var i = 0, len = items.length; i < len; ++i) {
      var def = items[i];
      this.add(def);
    }
  }
  add (item) {
    if ($.isElement(item)) {
      if (this._el) {
        this._el.appendChild(item);
      }
    } else if (item instanceof Widget) {
      item.appendTo(this._el);
    } else if (item.type) {
      var ctor;
      if (ctor = Widget.get(item.type)) {
        item = new ctor(item).appendTo(this._el);
      } else {
        logger.warn('unknown widget ctor: ' + item.type);
        return;
      }
    } else {
      logger.warn('unknown item could not be added to form');
      return;
    }

    this._items.push(item);
  }
  removeByName (name) {}
};

exports.prototype.isValid = true;
export default exports;
