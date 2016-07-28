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

import cache.LRUCache as LRUCache;
import device;

var FilterRenderer = Class(function () {

  var Canvas = null;
  var noCacheCanvas = null;
  var unusedCanvas = null;

  var CACHE_SIZE = 1024;
  var CACHE_FRAME_THRESHOLD = 3;

  this.cache = new LRUCache(CACHE_SIZE);

  var activeChecks = {};
  var pendingChecks = {};
  var currentFrame = 0;

  var needsInitialization = true;

  this.initialize = function() {
    Canvas = device.get('Canvas');
    noCacheCanvas = new Canvas({ useWebGL: CONFIG.useWebGL });
    needsInitialization = false;
    this.useCache = !device.isNative && !CONFIG.useWebGL;
    this.useWebGL = CONFIG.useWebGL;
    if (this.useCache) {
      // If we're using canvas caching, set up the tick subscription
      jsio('import ui.Engine').get().subscribe('Tick', this, this.onTick);
    }
  };

  this.onTick = function(dt) {
    currentFrame++;
    activeChecks = pendingChecks;
    pendingChecks = {};
  };

  this.renderFilter = function (ctx, srcImg, srcX, srcY, srcW, srcH) {
    if (needsInitialization) { this.initialize(); }
    var filter = ctx.filter;
    var filterName = filter && filter.getType && filter.getType();

    // Ugly hack, but WebGL still needs this class, for now, for masking.
    // The other filters are handled by the WebGL context itself.
    var filterNotSupported = this.useWebGL && filterName !== "NegativeMask" && filterName !== "PositiveMask";
    if (!filter || filterNotSupported || !filter.getType) { return null; }

    if (this.useCache) {
      var cacheKey = this.getCacheKey(srcImg.getURL(), srcX, srcY, srcW, srcH, filter);
      var resultImg = this.cache.get(cacheKey);
      if (resultImg) { return resultImg; }
    }

    var shouldCache = this.useCache && this.testShouldCache(cacheKey);
    if (shouldCache) {
      resultImg = this.getCanvas(srcW, srcH);
    } else {
      resultImg = noCacheCanvas;
      resultImg.width = srcW;
      resultImg.height = srcH;
    }

    switch (filterName) {
      case "LinearAdd":
        this.renderColorFilter(ctx, srcImg, srcX, srcY, srcW, srcH, filter, 'lighter', resultImg);
        break;

      case "Tint":
        this.renderColorFilter(ctx, srcImg, srcX, srcY, srcW, srcH, filter, 'source-over', resultImg);
        break;

      case "Multiply":
        this.renderMultiply(ctx, srcImg, srcX, srcY, srcW, srcH, filter, resultImg);
        break;

      case "NegativeMask":
        this.renderMask(ctx, srcImg, srcX, srcY, srcW, srcH, filter.getMask(), 'source-in', resultImg);
        break;

      case "PositiveMask":
        this.renderMask(ctx, srcImg, srcX, srcY, srcW, srcH, filter.getMask(), 'source-out', resultImg);
        break;
    }

    if (shouldCache) {
      var removedEntry = this.cache.put(cacheKey, resultImg);
      unusedCanvas = removedEntry ? removedEntry.value : null;
    }

    return resultImg;
  };

  this.testShouldCache = function(key) {
    var checkFrame = pendingChecks[key] = activeChecks[key] || currentFrame;
    return (currentFrame - checkFrame) > CACHE_FRAME_THRESHOLD;
  };


  this.renderColorFilter = function (ctx, srcImg, srcX, srcY, srcW, srcH, filter, op, destCanvas) {
    var result = destCanvas;
    var resultCtx = result.getContext('2d');
    // render the base image
    resultCtx.globalCompositeOperation = 'source-over';
    srcImg.render(resultCtx, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
    // render the filter color
    resultCtx.globalCompositeOperation = op;
    resultCtx.fillStyle = filter.getColorString();
    resultCtx.fillRect(0, 0, srcW, srcH);
    // use our base image to cut out the image shape from the rect
    resultCtx.globalCompositeOperation = 'destination-in';
    srcImg.render(resultCtx, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
    return result;
  };

  this.renderMultiply = function(ctx, srcImg, srcX, srcY, srcW, srcH, filter, destCanvas) {
    var color = filter.get();
    var result = destCanvas;
    var resultCtx = result.getContext('2d');
    var imgData = srcImg.getImageData(srcX, srcY, srcW, srcH);
    var data = imgData.data;
    // simplified multiply math outside of the massive for loop
    var a = color.a;
    var mr = 1 + a * ((color.r / 255) - 1);
    var mg = 1 + a * ((color.g / 255) - 1);
    var mb = 1 + a * ((color.b / 255) - 1);
    for (var i = 0, len = data.length; i < len; i += 4) {
      data[i] *= mr;
      data[i + 1] *= mg;
      data[i + 2] *= mb;
    }
    // put the updated rgb data into our new canvas
    resultCtx.putImageData(imgData, 0, 0);
    return result;
  };

  this.renderMask = function (ctx, srcImg, srcX, srcY, srcW, srcH, mask, op, destCanvas) {
    var result = destCanvas;
    var resultCtx = result.getContext('2d');
    // render the mask image
    var srcMaskX = mask.getSourceX();
    var srcMaskY = mask.getSourceY();
    var srcMaskW = mask.getSourceW();
    var srcMaskH = mask.getSourceH();
    resultCtx.globalCompositeOperation = 'source-over';
    mask.render(resultCtx, srcMaskX, srcMaskY, srcMaskW, srcMaskH, 0, 0, srcW, srcH);
    // render the base image
    resultCtx.globalCompositeOperation = op;
    srcImg.render(resultCtx, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
    return result;
  };

  this.clearCache = function () {
    this.cache.removeAll();
  };

  this.getCacheKey = function(url, srcX, srcY, srcW, srcH, filter) {
    var filterType = filter && filter.getType && filter.getType();
    var suffix;
    if (filterType === 'NegativeMask' || filterType === 'PositiveMask') {
      suffix = filter.getMask().getURL();
    } else {
      var color = filter.get();
      var alpha = (color.a * 255) & 0xff;
      suffix = "" + alpha + "|" + color.r + "|" + color.g + "|" + color.b;
    }
    var cacheKey = filterType + "|" + url + "|" + srcX + "|" + srcY + "|" + srcW + "|" + srcH + "|" + suffix;
    return cacheKey;
  };

  this.getCanvas = function(width, height) {
    var result;
    if (unusedCanvas) {
      result = unusedCanvas;
      result.width = width;
      result.height = height;
      unusedCanvas = null;
    } else {
      result = new Canvas({ width: width, height: height });
    }
    return result;
  };

});

exports = new FilterRenderer();
