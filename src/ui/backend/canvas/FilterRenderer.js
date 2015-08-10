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

exports = Class(function () {

	var CACHE_SIZE = 1024;
	var Canvas = device.get('Canvas');

    var cacheCount = 0;

	var unusedCanvas = null;

	this.cache = new LRUCache(CACHE_SIZE);

	this.renderFilter = function (ctx, srcImg, srcX, srcY, srcW, srcH) {
		var filterName;
		var filter;
		for (filterName in ctx.filters) {
			filter = ctx.filters[filterName];
			break;
		}
		if (!filter) { return null; }

		var cacheKey = this.getCacheKey(srcImg.getURL(), srcX, srcY, srcW, srcH, filter);
		var resultImg = this.cache.get(cacheKey);

		if (resultImg) { return resultImg; }

		switch (filterName) {
			case "LinearAdd":
				resultImg = this.renderColorFilter(ctx, srcImg, srcX, srcY, srcW, srcH, filter.get(), 'lighter');
				break;

			case "Tint":
				resultImg = this.renderColorFilter(ctx, srcImg, srcX, srcY, srcW, srcH, filter.get(), 'source-over');
				break;

			case "Multiply":
				resultImg = this.renderMultiply(ctx, srcImg, srcX, srcY, srcW, srcH, filter);
				break;

			case "NegativeMask":
				resultImg = this.renderMask(ctx, srcImg, srcX, srcY, srcW, srcH, filter.getMask(), 'source-in');
				break;

			case "PositiveMask":
				resultImg = this.renderMask(ctx, srcImg, srcX, srcY, srcW, srcH, filter.getMask(), 'source-out');
				break;

			default:
				return null;
		}

		var removedEntry = this.cache.put(cacheKey, resultImg);
		unusedCanvas = removedEntry ? removedEntry.value : null;

      	if (!unusedCanvas) { cacheCount++; }
		console.log("CACHE COUNT", cacheCount);

		return resultImg;
	};


	this.renderColorFilter = function (ctx, srcImg, srcX, srcY, srcW, srcH, color, op) {
		var result = this.getCanvas(srcW, srcH);
		var resultCtx = result.getContext('2d');
		// render the base image
		resultCtx.globalCompositeOperation = 'source-over';
		srcImg.render(resultCtx, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
		// render the filter color
		resultCtx.globalCompositeOperation = op;
		resultCtx.fillStyle = "rgba(" + color.r  + "," + color.g + "," + color.b + "," + color.a + ")";
		resultCtx.fillRect(0, 0, srcW, srcH);
		// use our base image to cut out the image shape from the rect
		resultCtx.globalCompositeOperation = 'destination-in';
		srcImg.render(resultCtx, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
		return result;
	};

	this.renderMultiply = function(ctx, srcImg, srcX, srcY, srcW, srcH, filter) {
		var color = filter.get();
		var result = this.getCanvas(srcW, srcH);
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

	this.renderMask = function (ctx, srcImg, srcX, srcY, srcW, srcH, mask, op) {
		var result = this.getCanvas(srcW, srcH);
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
		var filterType = filter.getType();
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
		var result = unusedCanvas || new Canvas();
		unusedCanvas = null;
		result.width = width;
		result.height = height;
		return result;
	};

});
