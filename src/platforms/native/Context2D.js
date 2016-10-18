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
import {
  merge,
  NATIVE,
  logger
} from 'base';

import uri from 'std/uri';
import Enum from 'lib/Enum';
import setProperty from 'util/setProperty';

import BufferedCanvas from './BufferedCanvas';
import device from 'device';
import FontRenderer from './FontRenderer';

import Font from 'ui/resource/Font';

var _createdOnscreenCanvas = false;

var compositeOps = new Enum({
  'source-atop': 1337,
  'source-in': 1338,
  'source-out': 1339,
  'source-over': 1340,
  'destination-atop': 1341,
  'destination-in': 1342,
  'destination-out': 1343,
  'destination-over': 1344,
  'lighter': 1345,
  'xor': 1346,
  'copy': 1347
});

var PixelArray = window.Uint8ClampedArray || window.CanvasPixelArray || window.Uint8Array ||
  window.Array;

exports = class extends BufferedCanvas {
  updateState (src, dest) {
    /*
    obj.stroke = this.stroke;
    obj.patternQuality = this.patternQuality;
    obj.fillPattern = this.fillPattern;
    obj.strokePattern = this.strokePattern;
*/
    dest.font = src.font;
    dest.textAlign = src.textAlign;
    dest.textBaseline = src.textBaseline;
    dest.fillStyle = src.fillStyle;
    dest.strokeStyle = src.strokeStyle;
    /*
    obj.shadow = this.shadow;
    obj.shadowBlur = this.shadowBlur;
    obj.shadowOffsetX = this.shadowOffsetX;
    obj.shadowOffsetY = this.shadowOffsetY;
*/
    return dest;
  }
  constructor (opts) {
    super(...arguments);

    this._stack = [];
    this._stackPos = 0;

    opts = merge(opts, {
      width: 480,
      height: 320,
      offscreen: true
    });

    this.unloadListener = opts.unloadListener;

    if (_createdOnscreenCanvas) {
      opts.offscreen = true;
    }

    this.canvas = opts.canvas || {
      width: opts.width,
      height: opts.height
    };

    this._isOffscreen = opts.offscreen;
    if (!this._isOffscreen) {
      _createdOnscreenCanvas = true;
    }

    this.resize(this.canvas.width, this.canvas.height);

    for (var i = 0; i < 64; i++) {
      this._stack[i] = this.updateState(this, {});
    }
  }
  destroy () {
    if (this.canvas._src) {
      NATIVE.gl.forgetCanvas(this.canvas._src);

      if (this._isOffscreen) {
        this._ctx = null;
        NATIVE.gl.deleteTexture(this.canvas._src);
      }
    }
  }
  resize (width, height) {
    // set the internal private properties (the public ones have setters that
    // would call this method again)
    this.canvas._width = width;
    this.canvas._height = height;

    if (this._isOffscreen) {
      var textureData;
      if (!this._ctx) {
        // create a new canvas
        textureData = NATIVE.gl.makeCanvas(width, height, this.unloadListener);
        this.canvas.__gl_name = textureData.__gl_name;
        this.canvas._src = textureData._src;
        this._ctx = new NATIVE.gl.Context2D(this.canvas, this.canvas._src,
          this.canvas.__gl_name);
      } else {
        // resize existing canvas
        textureData = this._ctx.resize(width, height);
        if (this.canvas._src != textureData._src) {
          // update canvas internals if backed by a new texture
          NATIVE.gl.updateCanvasURL(this.canvas._src, textureData._src);
          this.canvas.__gl_name = textureData.__gl_name;
          this.canvas._src = textureData._src;
        }
      }
    } else if (!this._ctx) {
      // if onscreen canvas has not been initialized
      this.canvas.__gl_name = -1;
      this.canvas._src = 'onscreen';
      this._ctx = new NATIVE.gl.Context2D(this.canvas, this.canvas._src,
        this.canvas.__gl_name);
    }
  }
  getNativeCtx () {
    return this._ctx;
  }
  getElement () {
    return this.canvas;
  }
  show () {}
  hide () {}
  clear () {
    this._ctx.clear();
  }
  swap (operations) {
    NATIVE.gl.flushImages();
  }
  loadIdentity () {
    this._ctx.loadIdentity();
  }
  save () {
    if (this._stack.length <= this._stackPos) {
      logger.log('expanding stack');
      this._stack.push({});
    }
    this.updateState(this, this._stack[this._stackPos++]);
    this._ctx.save();
  }
  restore () {
    this._ctx.restore();
    this.updateState(this._stack[this._stackPos--], this);
  }
  clipRect (x, y, w, h) {
    this._ctx.enableScissor(x, y, w, h);
  }
  drawImage (img, x1, y1, w1, h1, x2, y2, w2, h2) {
    if (!img || !img.complete) {
      return;
    }
    var n = arguments.length;
    if (n == 3) {
      this._ctx.drawImage(img.__gl_name, img._src, 0, 0, img.width, img.height,
        x1, y1, img.width, img.height);
    } else if (n == 5) {
      this._ctx.drawImage(img.__gl_name, img._src, 0, 0, img.width, img.height,
        x1, y1, w1, h1);
    } else {
      this._ctx.drawImage(img.__gl_name, img._src, x1, y1, w1, h1, x2, y2,
        w2, h2);
    }
  }
  translate (x, y) {
    this._ctx.translate(x, y);
  }
  rotate (r) {
    this._ctx.rotate(r);
  }
  scale (x, y) {
    this._ctx.scale(x, y);
  }
  setFilter (filter) {
    this._ctx.addFilter(filter.getType(), filter.get());
  }
  setFilters (filters) {
    logger.warn('ctx.setFilters is deprecated, use ctx.setFilter instead.');
    for (var name in filters) {
      var filter = filters[name];
      this._ctx.addFilter(name, filter.get());
    }
  }
  clearFilter () {
    this._ctx.clearFilters();
  }
  clearFilters () {
    logger.warn(
      'ctx.clearFilters is deprecated, use ctx.clearFilter instead.');
    this._ctx.clearFilters();
  }
  setTransform (m11, m12, m21, m22, dx, dy) {
    this._ctx.setTransform(m11, m12, m21, m22, dx, dy);
  }
  clearRect (x, y, width, height) {
    this._ctx.clearRect(x, y, width, height);
  }
  fillRect (x, y, width, height) {
    if (typeof this.fillStyle == 'object') {
      var img = this.fillStyle.img,
        w = img.width,
        h = img.height,
        wMax, hMax, xx, yy;

      switch (this.fillStyle.repeatPattern) {
        case 'repeat':
          for (xx = 0; xx < width; xx += w) {
            wMax = Math.min(w, width - xx);
            for (yy = y; yy < height; yy += h) {
              hMax = Math.min(h, height - yy);
              this._ctx.drawImage(img.__gl_name, img._src, 0, 0, wMax, hMax,
              x + xx, y + yy, wMax, hMax);
            }
          }
          break;
        case 'repeat-x':
          for (xx = 0; xx < width; xx += w) {
            wMax = Math.min(w, width - xx);
            this._ctx.drawImage(img.__gl_name, img._src, 0, 0, wMax, hMax, x +
            xx, y, wMax, hMax);
          }
          break;
        case 'repeat-y':
          for (yy = 0; yy < height; yy += h) {
            hMax = Math.min(h, height - yy);
            this._ctx.drawImage(img.__gl_name, img._src, 0, 0, wMax, hMax, x,
            y + yy, wMax, hMax);
          }
          break;
        case 'no-repeat':
        default:
          wMax = Math.min(w, width);
          hMax = Math.min(h, height);
          this._ctx.drawImage(img.__gl_name, img._src, 0, 0, wMax, hMax, x, y,
          wMax, hMax);
          break;
      }
    } else {
      this._ctx.fillRect(x, y, width, height, this.fillStyle);
    }
  }
  strokeRect (x, y, width, height) {
    this._ctx.strokeRect(x, y, width, height, this.strokeStyle, this.lineWidth ||
      1);
  }
  createPattern (img, repeatPattern) {
    return {
      img: img,
      repeatPattern: repeatPattern
    };
  }
  _checkPath () {
    if (!this._path) {
      this._path = [];
    }
    if (this._pathIndex === undefined) {
      this._pathIndex = 0;
    }
    return this._pathIndex > 0;
  }
  beginPath () {
    this._pathIndex = 0;
  }
  lineTo (x, y) {
    this._checkPath();
    this._path[this._pathIndex] = {
      x: x,
      y: y
    };
    this._pathIndex++;
  }
  drawPointSprites (x1, y1, x2, y2) {
    this._ctx.drawPointSprites(this.pointSprite.src, this.lineWidth || 5,
      this.pointSpriteStep || 2, this.strokeStyle, x1, y1, x2, y2);
  }
  closePath () {}
  fill () {
    if (this._checkPath()) {
      this._ctx.fill(this._path, this._pathIndex, this.fillStyle);
    }
  }
  stroke () {
    if (this._checkPath()) {
      this._ctx.stroke(this._path, this._pathIndex, this.strokeStyle);
    }
  }
  createImageData (width, height) {
    // createImageData can be passed another image data object
    // the data in the passed in image is not copied
    if (typeof width === 'object' && 'width' in width) {
      height = width.height;
      width = width.width;
    }

    return {
      width: width,
      height: height,
      data: new PixelArray(width * height)
    };
  }
  fill () {}
  stroke () {}
};

exports.prototype.font = '10px ' + device.defaultFontFamily;
exports.prototype.textAlign = 'start';
exports.prototype.textBaseline = 'alphabetic';
exports.prototype.fillStyle = 'rgb(255,255,255)';
exports.prototype.strokeStyle = 'rgb(0,0,0)';
exports.prototype.pointSprite = null;
exports.prototype.pointSpriteStep = 2;
setProperty(exports.prototype, 'globalAlpha', {
  get: function () {
    return this._ctx.getGlobalAlpha();
  },
  set: function (alpha) {
    return this._ctx.setGlobalAlpha(alpha);
  }
});

setProperty(exports.prototype, 'globalCompositeOperation', {
  get: function () {
    return compositeOps[this._ctx.getGlobalCompositeOperation()];
  },
  set: function (op) {
    return this._ctx.setGlobalCompositeOperation(compositeOps[op.toLowerCase()]);
  }
});

exports.prototype.moveTo = exports.prototype.lineTo;

exports.prototype.fillText = FontRenderer.wrapFillText(function (str, x, y,
  maxWidth) {
  var font = Font.parse(this.font);
  var fontName = font.getName();

  this._ctx.fillText(str + '', x, y, maxWidth || 0, this.fillStyle, font.getSize(), /* font.getWeight() + ' ' + */
    fontName, this.textAlign, this.textBaseline);
});

exports.prototype.strokeText = FontRenderer.wrapStrokeText(function (str, x, y,
  maxWidth) {
  var font = Font.parse(this.font);
  var fontName = font.getName();

  this._ctx.strokeText(str + '', x, y, maxWidth || 0, this.strokeStyle,
    font.getSize(), fontName, this.textAlign, this.textBaseline, this.lineWidth
  );
});

exports.prototype.measureText = FontRenderer.wrapMeasureText(function (str) {
  var font = Font.parse(this.font);
  var fontName = font.getName();

  return this._ctx.measureText(str + '', font.getSize(), font.getWeight() +
    ' ' + fontName);
});

export default exports;
