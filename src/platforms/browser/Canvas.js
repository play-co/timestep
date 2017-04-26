let exports = {};

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
/**
 * @package timestep.env.browser.Canvas;
 *
 * Canvas implementation for browsers. Wraps a Context2D.
 */
import {
  merge,
  CONFIG
} from 'base';

import Context2D from './Context2D';
import WebGLContext2D from './webgl/WebGLContext2D';

exports = class {
  constructor (opts) {
    opts = merge(opts, {
      width: 300,
      height: 200
    });

    this._width = opts.width;
    this._height = opts.height;
    this.isWebGL = !!opts.useWebGL && !!CONFIG.useWebGL && WebGLContext2D.isSupported;

    var ctx;

    if (this.isWebGL) {
      ctx = WebGLContext2D.getContext(this, opts);
    } else {
      ctx = new Context2D(opts);
    }

    var el = this._el = ctx.getElement();

    el.isWebGL = this.isWebGL;
    el.complete = true;

    if (el.style) {
      el.style.userSelect = el.style.webkitUserSelect = el.style.webkitTouchCallout =
        'none';
    }

    el.getContext = function () {
      return ctx;
    };

    return el;
  }
  get width () {
    return this._width;
  }
  set width (value) {
    this._width = value;
    if (this.isWebGL) {
      this.getContext().resize(this.width, this.height);
    }
  }
  get height () {
    return this._height;
  }
  set height (value) {
    this._height = value;
    if (this.isWebGL) {
      this.getContext().resize(this.width, this.height);
    }
  }
};

export default exports;
