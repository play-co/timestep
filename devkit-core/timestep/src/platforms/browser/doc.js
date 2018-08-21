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
import { merge } from 'base';

import PubSub from 'lib/PubSub';
import enumeration from 'lib/Enum';

import device from 'device';

var SCALING = enumeration('FIXED', 'RESIZE', 'MANUAL');
var defaultScalingMode = SCALING.RESIZE;

/**
 * @extends lib.PubSub
 */
class Document extends PubSub {

  constructor () {
    super();

    this.width = 0;
    this.height = 0;
    this._canvas = null;
    this._scalingMode = defaultScalingMode;
    this._scalingOpts = null;
    this._initialized = false;

    this._setScalingMode(defaultScalingMode);

    device.screen.subscribe('Resize', this, 'onResize');
  }

  get initialized () {
    return this._initialized;
  }

  unsubscribeResize () {
    device.screen.unsubscribe('Resize', this, 'onResize');
  }

  setCanvas (canvas) {
    this._canvas = canvas;
    document.body.appendChild(this._canvas);
  }

  setScalingMode (scalingMode) {
    this._setScalingMode();
    this.onResize();
  }

  _setScalingMode (scalingMode, opts) {
    this._scalingMode = scalingMode;

    switch (scalingMode) {
      case SCALING.FIXED:
        opts = merge(opts, {
          width: device.width,
          height: device.height
        });

        var dpr = device.screen.devicePixelRatio;

        var width = opts.width;
        var height = opts.height;

        this._canvas.width = width * dpr;
        this._canvas.height = height * dpr;
        var ctx = this._canvas.getContext();
        if (ctx.resize) {
          ctx.resize(width * dpr, height * dpr);
        }

        this._canvas.style.width = width + 'px';
        this._canvas.style.height = height + 'px';

        var top = opts.top;
        if (top) {
          this._canvas.style.top = top + 'px';
        }

        var left = opts.left;
        if (left) {
          this._canvas.style.left = left + 'px';
        }

        break;
      case SCALING.RESIZE:
        opts = merge(opts, { resizeCanvas: true });
      // fall through:
      case SCALING.MANUAL:
        break;
    }

    this._scalingOpts = opts;
  }

  onResize () {
    if (!this._canvas) {
      return;
    }

    var width = device.width;
    var height = device.height;

    if (!this._initialized) {
      if (!isFinite(width) || !isFinite(height)) {
        return;
      }

      this._initialized = true;
      this.publish('initialized');
    }

    var el = this._canvas;
    var cs = this._canvas.style;
    var orientation = device.screen.orientation;
    el.className = orientation;

    var mode = this._scalingMode;
    var opts = this._scalingOpts;
    // debugger

    if (mode == SCALING.FIXED) {
      width = opts.width;
      height = opts.height;
    }

    // enforce maxWidth/maxHeight
    // if maxWidth/maxHeight is met, switch a RESIZE scaling mode to FIXED (center the document on the screen)
    if (opts.maxWidth && width > opts.maxWidth) {
      width = opts.maxWidth;
      if (mode == SCALING.RESIZE) {
        mode = SCALING.FIXED;
      }
    }

    if (opts.maxHeight && height > opts.maxHeight) {
      height = opts.maxHeight;
      if (mode == SCALING.RESIZE) {
        mode = SCALING.FIXED;
      }
    }

    switch (mode) {
      case SCALING.MANUAL:
        // do nothing
        break;

      case SCALING.FIXED:
        // try to center the container
        var top = opts.top;
        if (top === null || top === undefined) {
          cs.top = Math.round(Math.max(0, (window.innerHeight - height) / 2)) + 'px';
        }
        var left = opts.left;
        if (left === null || left === undefined) {
          cs.left = Math.round(Math.max(0, (window.innerWidth - width) / 2)) + 'px';
        }
        break;

      case SCALING.RESIZE:
        /// #if PLATFORM === 'line'
        cs.top = '44px';
        /// #endif

        var dpr = device.screen.devicePixelRatio;
        var scaledWidth = width / dpr;
        var scaledHeight = height / dpr;
        if (opts.resizeCanvas && (cs.width !== scaledWidth || cs.height !== scaledHeight)) {
          this._canvas.width = width;
          this._canvas.height = height;
          var ctx = this._canvas.getContext();
          if (ctx.resize) {
            ctx.resize(width, height);
          }

          cs.width = scaledWidth + 'px';
          cs.height = scaledHeight + 'px';

          /// #if PLATFORM != 'wc'
          // Hack to make sure the top of the canvas matches with the top of the inner window
          window.scrollTo(0, 1);
          /// #endif
        }
        break;
    }

    this._setDim(width, height);
  }

  _setDim (width, height) {
    if (this.width !== width || this.height !== height) {
      this.width = width;
      this.height = height;
      this.publish('Resize', width, height);
    }
  }
}

Document.prototype.SCALING = SCALING;

var doc = new Document();
export default doc;
