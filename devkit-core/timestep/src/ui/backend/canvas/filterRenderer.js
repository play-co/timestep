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
 * @class ui.backend.canvas.FilterRenderer;
 * Renders filter effects to a canvas. Manages filtered canvas caching.
 */

import LRUCache from 'cache/LRUCache';
import engine from 'ui/engine';

import userAgent from 'userAgent';
import Canvas from 'platforms/browser/Canvas';

const COMPOSITE_MULTIPLY_SUPPORTED = userAgent.browserType !== 'Internet Explorer';

var noCacheCanvas = null;
var unusedCanvas = null;

var CACHE_SIZE = 1024;
var CACHE_FRAME_THRESHOLD = 3;

var activeChecks = {};
var pendingChecks = {};
var currentFrame = 0;

var needsInitialization = true;

class FilterRenderer {

  initialize () {
    noCacheCanvas = new Canvas({ useWebGL: false });
    needsInitialization = false;
    this.useWebGL = engine.useWebGL;

    // We will enable the cache only when needed
    this.isCacheEnabled = false;
  }

  enableCache () {
    this.isCacheEnabled = true;
    engine.subscribe('Tick', this, this.onTick);
  }

  onTick () {
    currentFrame++;
    activeChecks = pendingChecks;
    pendingChecks = {};
  }

  renderFilter (ctx, image, srcX, srcY, srcW, srcH) {
    if (needsInitialization) {
      this.initialize();
    }

    var filter = ctx.filter;
    var filterName = filter && filter.getType && filter.getType();
    var isMaskFilter = filterName === 'NegativeMask' || filterName === 'PositiveMask';

    // Ugly hack, but WebGL still needs this class, for now, for masking.
    // The other filters are handled by the WebGL context itself.
    var filterNotSupported = ctx.isWebGL && !isMaskFilter;

    if (!filter || filterNotSupported || !filter.getType) {
      return null;
    }

    var cacheKey;
    var resultImg;
    var shouldCache = false;

    if (!this.useWebGL || isMaskFilter) {
      if (!this.isCacheEnabled) this.enableCache();
      cacheKey = this.getCacheKey(image.getURL(), srcX, srcY, srcW, srcH, filter);
      resultImg = this.cache.get(cacheKey);
      if (resultImg) {
        return resultImg;
      }

      shouldCache = this.testShouldCache(cacheKey);
    }

    if (shouldCache) {
      resultImg = this.getCanvas(srcW, srcH);
    } else {
      resultImg = noCacheCanvas;
      resultImg.needsUpload = true;
      resultImg.width = srcW;
      resultImg.height = srcH;
    }


    var resultCtx = resultImg.getContext('2d');
    resultCtx.needsUpload = true;

    switch (filterName) {
      case 'LinearAdd':
        this.renderColorFilter(ctx, image, srcX, srcY, srcW, srcH, filter, 'lighter', resultCtx);
        break;

      case 'Tint':
        this.renderColorFilter(ctx, image, srcX, srcY, srcW, srcH, filter, 'source-over', resultCtx);
        break;

      case 'Multiply':
        if (COMPOSITE_MULTIPLY_SUPPORTED) {
          this.renderColorFilter(ctx, image, srcX, srcY, srcW, srcH, filter, 'multiply', resultCtx);
        } else {
          this.renderMultiply(ctx, image, srcX, srcY, srcW, srcH, filter, resultCtx);
        }
        break;

      case 'NegativeMask':
        this.renderMask(ctx, image, srcX, srcY, srcW, srcH, filter.getMask(), 'source-in', resultCtx);
        break;

      case 'PositiveMask':
        this.renderMask(ctx, image, srcX, srcY, srcW, srcH, filter.getMask(), 'source-out', resultCtx);
        break;
    }

    if (shouldCache) {
      var removedEntry = this.cache.put(cacheKey, resultImg);
      unusedCanvas = removedEntry ? removedEntry.value : null;
    }

    return resultImg;
  }

  testShouldCache (key) {
    var checkFrame = pendingChecks[key] = activeChecks[key] || currentFrame;
    return currentFrame - checkFrame > CACHE_FRAME_THRESHOLD;
  }

  renderColorFilter (ctx, image, srcX, srcY, srcW, srcH, filter, op, resultCtx) {
    // render the base image
    resultCtx.globalCompositeOperation = 'source-over';
    image.render(resultCtx, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
    // render the filter color
    resultCtx.globalCompositeOperation = op;
    resultCtx.fillStyle = filter._color.toString();
    resultCtx.fillRect(0, 0, srcW, srcH);
    // use our base image to cut out the image shape from the rect
    resultCtx.globalCompositeOperation = 'destination-in';
    image.render(resultCtx, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
  }

  renderMultiply (ctx, image, srcX, srcY, srcW, srcH, filter, resultCtx) {
    var color = filter._color.get();
    var imgData = image.getImageData(srcX, srcY, srcW, srcH);
    var data = imgData.data;
    // simplified multiply math outside of the massive for loop
    var a = color.a;
    var mr = 1 + a * (color.r / 255 - 1);
    var mg = 1 + a * (color.g / 255 - 1);
    var mb = 1 + a * (color.b / 255 - 1);
    for (var i = 0, len = data.length; i < len; i += 4) {
      data[i] *= mr;
      data[i + 1] *= mg;
      data[i + 2] *= mb;
    }
    // put the updated rgb data into our new canvas
    resultCtx.putImageData(imgData, 0, 0);
  }

  renderMask (ctx, image, srcX, srcY, srcW, srcH, mask, op, resultCtx) {
    // render the mask image
    var map = mask.getBounds();
    var srcMaskX = map.x;
    var srcMaskY = map.y;
    var srcMaskW = map.width;
    var srcMaskH = map.height;

    // scale texture mapping to that of destination space
    var ratioX = srcW / mask.getWidth(),
        ratioY = srcH / mask.getHeight(),
        offsetX = map.marginLeft * ratioX,
        offsetY = map.marginTop * ratioY,
        destW = srcW - (map.marginLeft + map.marginRight) * ratioX,
        destH = srcH - (map.marginTop + map.marginBottom) * ratioY;

    // render mask
    resultCtx.globalCompositeOperation = 'source-over';
    mask.render(resultCtx, srcMaskX, srcMaskY, srcMaskW, srcMaskH, offsetX, offsetY, destW, destH);

    // // render the base image
    resultCtx.globalCompositeOperation = op;
    image.render(resultCtx,
      srcX + offsetX, srcY + offsetY,
      destW, destH,
      offsetX, offsetY,
      destW, destH);

  }

  clearCache () {
    this.cache.removeAll();
  }

  getCacheKey (url, srcX, srcY, srcW, srcH, filter) {
    var filterType = filter && filter.getType && filter.getType();
    var suffix;
    if (filterType === 'NegativeMask' || filterType === 'PositiveMask') {
      suffix = filter.getMask().getURL();
    } else {
      var color = filter._color.get();
      var alpha = color.a * 255 & 255;
      suffix = '' + alpha + '|' + color.r + '|' + color.g + '|' + color.b;
    }
    var cacheKey = filterType + '|' + url + '|' + srcX + '|' + srcY + '|' +
      srcW + '|' + srcH + '|' + suffix;
    return cacheKey;
  }

  getCanvas (width, height) {
    var result;
    if (unusedCanvas) {
      result = unusedCanvas;
      result.width = width;
      result.height = height;
      unusedCanvas = null;
    } else {
      result = new Canvas({
        width: width,
        height: height
      });
    }
    return result;
  }

}

FilterRenderer.prototype.cache = new LRUCache(CACHE_SIZE);

export default new FilterRenderer();
