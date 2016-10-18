let exports = {};

import {
  NATIVE,
  logger,
  merge,
  bind
} from 'base';

/**
 * @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the Mozilla Public License v. 2.0 as published by Mozilla.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * Mozilla Public License v. 2.0 for more details.

 * You should have received a copy of the Mozilla Public License v. 2.0
 * along with the Game Closure SDK.  If not, see <http://mozilla.org/MPL/2.0/>.
 */
var T = NATIVE.textbox;
var SLICE = Array.prototype.slice;

var defaults = {
  x: 0,
  y: 0,
  width: 100,
  height: 30,
  text: '',
  color: 'white'
};

exports = class {
  constructor(opts) {
    logger.log('in init');
    opts = merge(opts, defaults);
    logger.log('making a textbox with opts', JSON.stringify(opts));
    this._id = T.create(opts.x, opts.y, opts.width, opts.height, opts.text);
  }
  setPosition(p) {
    T.setPosition(this._id, p.x, p.y);
    return this;
  }
  getPosition() {
    return {
      x: this.getX(),
      y: this.getY()
    };
  }
  setDimensions(d) {
    T.setDimensions(this._id, d.width, d.height);
    return this;
  }
  getDimensions() {
    return {
      width: this.getWidth(),
      height: this.getHeight()
    };
  }
  setApp() {
  }
  setOpacity(opacity) {
    T.setOpacity(this._id, opacity);
  }
  setVisible(isVisible) {
    if (isVisible) {
      T.show(this._id);
    } else {
      T.hide(this._id);
    }
  }
  setValue(text) {
    T.setValue(this._id, text);
  }
};

var methods = [
  'destroy',
  'show',
  'hide',
  'setValue',
  'setOpacity',
  'setType',
  'setVisible',
  'getX',
  'getY',
  'getWidth',
  'getHeight',
  'getValue',
  'getOpacity',
  'getType',
  'getVisible'
];

for (var i = 0, m; m = methods[i]; ++i) {
  bind(exports.prototype, function (m) {
    // getters return the value, setters return this
    if (/^get/.test(m)) {
      exports.prototype[m] = function () {
        return T[m].apply(T, [this._id].concat(SLICE.call(arguments, 0)));
      };
    } else {
      exports.prototype[m] = function () {
        T[m].apply(T, [this._id].concat(SLICE.call(arguments, 0)));
        return this;
      };
    }
  })(m);
}


export default exports;
