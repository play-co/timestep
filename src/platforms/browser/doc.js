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

import lib.PubSub;
import lib.Enum as Enum;
from util.browser import $;

import device;
import userAgent;

var isIOS7 = device.iosVersion === 7;
var isIOSSafari = device.iosVersion >= 7 && !device.isIpad && !device.isStandalone && !device.isUIWebView;
var enableLandscapeScroll = isIOSSafari && window.parent === window;

var SCALING = Enum('FIXED', 'RESIZE', 'MANUAL');
var defaultScalingMode = !device.isMobileNative || device.simulating ? SCALING.RESIZE : SCALING.FIXED;

/**
 * @extends lib.PubSub
 */
var Document = Class(lib.PubSub, function () {
  this.init = function () {
    if (!$) {
      return;
    }

    var doc = GLOBAL.document;
    var body = doc && doc.body;

    this._el = $({
      parent: body,
      style: {
        position: 'absolute',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        transform: 'skewx(0.00001deg)'
      }
    });

    device.screen.subscribe('Resize', this, 'onResize');
    if (exports.postCreateHook) { exports.postCreateHook(this); }
    this.setScalingMode(defaultScalingMode);
  };

  this.unsubscribeResize = function () {
    device.screen.unsubscribe('Resize', this, 'onResize');
  };

  this.setEngine = function (engine) {
    if (engine == this._engine) { return; }

    if (engine.getOpt('minIOSLandscapeScroll') > device.iosVersion
        || engine.getOpt('disableIOSLandscapeScroll')) {
      enableLandscapeScroll = false;
    }

    this._engine = engine;
    this._canvas = this._engine.getCanvas();

    if (enableLandscapeScroll) {
      this._canvas.style.position = 'fixed';
    }

    this.appendChild(this._canvas);

    if (this._canvas.getContext) {
      var ctx = this._canvas.getContext(window.WebGLRenderingContext ? 'webgl' : '2d');
      if (ctx.setParentNode) {
        ctx.setParentNode(this._el);
      }
    }
  };

  this.getElement = function () {
    return this._el;
  };

  this.setScalingMode = function (scalingMode, opts) {
    this._scalingMode = scalingMode;

    var el = this._el,
      s = el.style;

    switch (scalingMode) {
      case SCALING.FIXED:
        opts = merge(opts, {
            width: device.width,
            height: device.height
          });
        s.width = opts.width + 'px';
        s.height = opts.height + 'px';
        break;
      case SCALING.RESIZE:
        opts = merge(opts, {
            resizeCanvas: true
          });
        // fall through:
      case SCALING.MANUAL:
        s.margin = '0px';
        s.width = '100%';
        s.height = '100%';
        break;
    }

    this._scalingOpts = opts;
    this.onResize();
    setTimeout(bind(this, 'onResize'), 1000);
  };

  this.onResize = function () {
    var isIOS = userAgent.OS_TYPE === 'iPhone OS';
    var el = this._el;
    var s = this._el.style;
    var orientation = device.screen.orientation;
    el.className = orientation;

    if (enableLandscapeScroll) {
      // on phones, ios7 will only ever be 320px high max (does not change until the 6+)
      var isLandscape = orientation === 'landscape';
      document.documentElement.style.height = isLandscape && isIOS7 ? window.innerHeight == 320 ? '320px' : '640px' : '100%';
      document.body.style.height = isIOS7 ? '100%' : '150%';
    } else {
      document.body.style.height = '100%';
    }

    logger.log('resize', device.width, device.height);

    var width = device.width;
    var height = device.height;
    var mode = this._scalingMode;
    var opts = this._scalingOpts;

    if (mode == SCALING.FIXED) {
      width = opts.width;
      height = opts.height;
    }

    // enforce maxWidth/maxHeight
    // if maxWidth/maxHeight is met, switch a RESIZE scaling mode to FIXED (center the document on the screen)
    if (opts.maxWidth && width > opts.maxWidth) {
      width = opts.maxWidth;
      if (mode == SCALING.RESIZE) { mode = SCALING.FIXED; }
    }

    if (opts.maxHeight && height > opts.maxHeight) {
      height = opts.maxHeight;
      if (mode == SCALING.RESIZE) { mode = SCALING.FIXED; }
    }

    // We may need to pause the engine when resizing on iOS
    var needsPause = isIOS && this._engine && this._engine.isRunning;

    switch (mode) {
      case SCALING.MANUAL:
        break; // do nothing

      case SCALING.FIXED:
        // try to center the container
        el.style.top = Math.round(Math.max(0, (window.innerHeight - height) / 2)) + 'px';
        el.style.left = Math.round(Math.max(0, (window.innerWidth - width) / 2)) + 'px';

        s.width = width + 'px';
        s.height = height + 'px';
        break;

      case SCALING.RESIZE:
        var cs = this._canvas && this._canvas.style;
        var dpr = device.screen.devicePixelRatio;
        var scaledWidth = width / dpr;
        var scaledHeight = height / dpr;
        // if we have a canvas element, scale it
        if (opts.resizeCanvas && this._canvas
            && (cs.width != scaledWidth|| cs.height != scaledHeight)) {
          this._canvas.width = width;
          this._canvas.height = height;
          var ctx = this._canvas.getContext();
          if (ctx.resize) {
            ctx.resize(width, height);
          }

          var needsPause = isIOS && this._engine && this._engine.isRunning;
          if (isIOS) {
            // There is a mobile browser bug that causes the canvas to not properly
            // resize. This forces a reflow, with the side effect of a brief screen flash.
            var engine = this._engine;
            if (needsPause) { engine.pause(); }
            cs.display = 'none';
            setTimeout(function() {
              cs.display = 'block';
              if (needsPause) { engine.resume(); }
            }, 250);
          }

          cs.width = scaledWidth + 'px';
          cs.height = scaledHeight + 'px';
        }

        s.width = scaledWidth + 'px';
        s.height = scaledHeight + 'px';
        break;
    }

    // make sure to force a render immediately (should we use needsRepaint instead?)
    this._setDim(width, height);
    if (this._engine && !needsPause) { this._engine.render(); }
  };

  this._setDim = function (width, height) {
    if (this.width != width || this.height != height) {
      this.width = width;
      this.height = height;
      this.publish('Resize', width, height);
    }
  };

  this.setColors = function (bgColor, engineColor) {
    if (this._el) {
      this._el.style.background = engineColor;
      document.documentElement.style.background = document.body.style.background = bgColor;
    }
  };

  this.appendChild = function (el) {
    this._el.appendChild(el);
  };

  this.getOffset = function () {
    return {
      x: this._el.offsetLeft,
      y: this._el.offsetTop
    };
  };
});

exports = new Document();
exports.SCALING = SCALING;

exports.setDocStyle = function () {
  var doc = GLOBAL.document,
    body = doc && doc.body;

  if (body) {
    var docStyle = {
      height: '100%',
      margin: '0px',
      padding: '0px'
    };

    $.style(document.documentElement, docStyle);
    $.style(document.body, docStyle);
  }
};

exports.defaultParent = null;
exports.postCreateHook = null;
