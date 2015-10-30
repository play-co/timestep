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
 * @class ui.ImageScaleView
 *
 * @doc http://doc.gameclosure.com/api/ui-imageview.html#class-ui.imagescaleview
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/ui/imageview.md
 */

import ui.View;
import ui.resource.Image as Image;
import ui.resource.loader as resourceLoader;
import ui.resource.ImageViewCache as ImageViewCache;

exports = Class(ui.View, function (supr) {

	var defaults = {
		image: null,
		autoSize: false,
		scaleMethod: 'stretch',
		renderCenter: true
	};

	this.init = function (opts) {
		supr(this, 'init', [merge(opts, defaults)]);
	};

	this.getScaleMethod = function () {
		return this._scaleMethod;
	};

	this.updateSlices = function (opts) {
		opts = opts || this._opts;

		// reset slice cache
		this._renderCacheKey = {};
		this._sliceCache = [];
		for (var i = 0; i < 9; ++i) {
			var row = [this._img.getSource(), 0, 0, 0, 0, 0, 0, 0, 0];
			row.render = false;
			this._sliceCache.push(row);
		}

		opts.destSlices = opts.destSlices || opts.sourceSlices;
		// {horizontal: {left: n, center: n, right: n}, vertical: {top: n, middle: n, bottom: n}}
		this._sourceSlices = opts.sourceSlices;
		// {horizontal: {left: n, right: n}, vertical: {top: n, bottom: n}}
		this._destSlices = opts.destSlices;

		this._imgScale = opts.imgScale || 1;

		if (!opts.sourceSlices || !(opts.sourceSlices.horizontal || opts.sourceSlices.vertical)) {
			throw new Error('slice views require sourceSlices.horizontal and/or sourceSlices.vertical');
		}

		if (opts.scaleMethod === '2slice') {
			if (opts.sourceSlices.horizontal && opts.destSlices.horizontal) {
				if (opts.destSlices.horizontal.left) {
					opts.sourceSlices.horizontal.center = opts.sourceSlices.horizontal.right;
					opts.sourceSlices.horizontal.right = 0;
				} else if (opts.destSlices.horizontal.right) {
					opts.sourceSlices.horizontal.center = opts.sourceSlices.horizontal.left;
					opts.sourceSlices.horizontal.left = 0;
				}
			}
			if (opts.sourceSlices.vertical && opts.destSlices.vertical) {
				if (opts.destSlices.vertical.top) {
					opts.sourceSlices.vertical.middle = opts.sourceSlices.vertical.bottom;
					opts.sourceSlices.vertical.bottom = 0;
				} else if (opts.destSlices.vertical.bottom) {
					opts.sourceSlices.vertical.middle = opts.sourceSlices.vertical.bottom;
					opts.sourceSlices.vertical.bottom = 0;
				}
			}
		}

		if (opts.sourceSlices.horizontal) {
			var src = opts.sourceSlices.horizontal;
			var slices = [src.left || 0, src.center || 0, src.right || 0];
			if (src.center == undefined && this._img) { // also captures null, but ignores 0
				var width = this._img.getWidth();
				slices[1] = width ? width - slices[0] - slices[2] : 0;
			}

			this._sourceSlicesHor = slices;
			this._destSlicesHor = [
				(this._destSlices.horizontal.left || 0) * this._imgScale,
				0,
				(this._destSlices.horizontal.right || 0) * this._imgScale
			];
		} else {
			this._sourceSlicesHor = [0, 100, 0];
			this._destSlicesHor = [0, 100, 0];
		}

		if (opts.sourceSlices.vertical) {
			var src = opts.sourceSlices.vertical;
			var slices = [src.top || 0, src.middle || 0, src.bottom || 0];
			if (src.middle == undefined && this._img) {
				var height = this._img.getHeight();
				slices[1] = height ? height - slices[0] - slices[2] : 0;
			}

			this._sourceSlicesVer = slices;
			this._destSlicesVer = [
				(this._destSlices.vertical.top || 0) * this._imgScale,
				0,
				(this._destSlices.vertical.bottom || 0) * this._imgScale
			];
		} else {
			this._sourceSlicesVer = [0, 100, 0];
			this._destSlicesVer = [0, 100, 0];
		}
	};

	this.updateOpts = function (opts) {
		var opts = supr(this, 'updateOpts', arguments);
		var changeScaleMethod = opts.scaleMethod && this._scaleMethod != opts.scaleMethod;
		if (changeScaleMethod) {
			var key = opts.scaleMethod;
			if (/slice$/.test(key)) {
				key = 'slice';
			}

			this.render = renderFunctions[key];
			this._renderCacheKey = {};
			this._scaleMethod = opts.scaleMethod;
			this._isSlice = this._scaleMethod.slice(1) == 'slice';
		}

		if ('debug' in opts) {
			this.debug = !!opts.debug;
		}

		if (opts.image) {
			this.setImage(opts.image);
		} else if (changeScaleMethod && this._isSlice && this._img) {
			this.updateSlices();
		}

		if (opts.verticalAlign) {
			this._renderCacheKey = {};
			this._verticalAlign = opts.verticalAlign;
		}
		if (opts.align || opts.horizontalAlign) {
			this._align = opts.align || opts.horizontalAlign;
		}

		// tile mode
		if ('rows' in opts) {
			this.rows = opts.rows;
		}
		if ('columns' in opts) {
			this.columns = opts.columns;
		}
		var r = this.rows;
		var c = this.columns;
		if (this._scaleMethod == 'tile' && (!(r || c) || (r && c))) {
			throw new Error('tile views must define either rows or columns');
		}

		return opts;
	};

	this._computeSlices = function (w, h, absScale) {
		var bounds = this._img.getBounds();
		var iw = bounds.width;
		var ih = bounds.height;
		if (iw <= 0 || ih <= 0) {
			return;
		}

		var image = this._img.getSource();
		var sourceSlicesHor = this._sourceSlicesHor;
		var sourceSlicesVer = this._sourceSlicesVer;
		var destSlicesHor = [];
		var destSlicesVer = [];

		if (sourceSlicesHor) {
			var ratio = this.style.fixedAspectRatio ? h / ih : 1;
			destSlicesHor[0] = this._destSlicesHor[0] * ratio;
			destSlicesHor[2] = this._destSlicesHor[2] * ratio;
			destSlicesHor[1] = w - destSlicesHor[0] - destSlicesHor[2];

			if (destSlicesHor[1] < 0) {
				destSlicesHor[0] = (destSlicesHor[0] * w / (destSlicesHor[0] + destSlicesHor[2])) | 0;
				destSlicesHor[1] = 0;
				destSlicesHor[2] = w - destSlicesHor[0];
			}
		}

		if (sourceSlicesVer) {
			var ratio = this.style.fixedAspectRatio ? w / iw : 1;
			destSlicesVer[0] = this._destSlicesVer[0] * ratio;
			destSlicesVer[2] = this._destSlicesVer[2] * ratio;
			destSlicesVer[1] = h - destSlicesVer[0] - destSlicesVer[2];

			if (destSlicesVer[1] < 0) {
				destSlicesVer[0] = (destSlicesVer[0] * h / (destSlicesVer[0] + destSlicesVer[2])) | 0;
				destSlicesVer[1] = 0;
				destSlicesVer[2] = h - destSlicesVer[0];
			}
		}

		var marginLeft = bounds.marginLeft,
			origLeftSlice = sourceSlicesHor[0] + bounds.marginLeft;
		if (origLeftSlice && destSlicesHor[0]) {
			marginLeft *= destSlicesHor[0] / origLeftSlice;
		}

		var marginRight = bounds.marginRight,
			origRightSlice = sourceSlicesHor[2] + bounds.marginRight;
		if (origRightSlice && destSlicesHor[2]) {
			marginRight *= destSlicesHor[2] / origRightSlice;
		}

		var marginTop = bounds.marginTop,
			origTopSlice = sourceSlicesVer[0] + bounds.marginTop;
		if (origTopSlice && destSlicesVer[0]) {
			marginTop *= destSlicesVer[0] / origTopSlice;
		}

		var marginBottom = bounds.marginBottom,
			origBottomSlice = sourceSlicesVer[2] + bounds.marginBottom;
		if (origBottomSlice && destSlicesVer[2]) {
			marginBottom *= destSlicesVer[2] / origBottomSlice;
		}

		if (destSlicesHor[0]) {
			destSlicesHor[0] -= marginLeft;
		} else {
			destSlicesHor[1] -= marginLeft;
		}

		if (destSlicesVer[0]) {
			destSlicesVer[0] -= marginTop;
		} else {
			destSlicesVer[1] -= marginTop;
		}

		if (destSlicesHor[2]) {
			destSlicesHor[2] -= marginRight;
		} else {
			destSlicesHor[1] -= marginRight;
		}

		if (destSlicesVer[2]) {
			destSlicesVer[2] -= marginBottom;
		} else {
			destSlicesVer[1] -= marginBottom;
		}

		var heightBalance = 0;
		var sx, sw, sh;
		var sy = bounds.y;
		var dx, dw, dh;
		var dy = marginTop;
		var i, j;

		for (j = 0; j < 3; j++) {
			var widthBalance = 0;
			var idealHeight = destSlicesVer[j] + heightBalance;
			var roundedHeight = Math.round(absScale * idealHeight) / absScale;
			heightBalance = idealHeight - roundedHeight;

			sh = sourceSlicesVer[j];
			dh = roundedHeight;
			sx = bounds.x;
			dx = marginLeft;
			for (i = 0; i < 3; i++) {
				var idealWidth = destSlicesHor[i] + widthBalance;
				var roundedWidth = Math.round(absScale * idealWidth) / absScale;
				widthBalance = idealWidth - roundedWidth;

				sw = sourceSlicesHor[i];
				dw = roundedWidth;

				var cache = this._sliceCache[j * 3 + i];
				if (sw > 0 && sh > 0 && dw > 0 && dh > 0) {
					cache[1] = sx;
					cache[2] = sy;
					cache[3] = sw;
					cache[4] = sh;
					cache[5] = dx;
					cache[6] = dy;
					cache[7] = dw;
					cache[8] = dh;
					cache.render = true;
				} else {
					cache.render = false;
				}

				sx += sw;
				dx += dw;
			}
			sy += sh;
			dy += dh;

			marginTop = 0;
		}
	};

	this.getImage = function () {
		return this._img;
	};

	this.setImage = function (img, opts) {
		this._renderCacheKey = {};

		var autoSized = false;
		var sw, sh, iw, ih, bounds;
		var viewOpts = this._opts;
		var forceReload = opts && opts.forceReload;

		if (typeof img == 'string') {
			bounds = resourceLoader.getMap()[img];
			if (bounds) {
				iw = bounds.w + bounds.marginLeft + bounds.marginRight;
				ih = bounds.h + bounds.marginTop + bounds.marginBottom;
			}

			// resolve to object
			img = ImageViewCache.getImage(img, forceReload);
		} else if (img instanceof Image) {
			if (forceReload) {
				img.reload();
			} else if (img.isLoaded()) {
				bounds = img.getBounds();
				iw = bounds.width + bounds.marginLeft + bounds.marginRight;
				ih = bounds.height + bounds.marginTop + bounds.marginBottom;
			}
		}

		if (img && !bounds) {
			if (!img.isError()) {
				img.doOnLoad(this, 'setImage', img);
			}
			return;
		}

		if (viewOpts.autoSize && this._scaleMethod == 'stretch' && !((viewOpts.width || viewOpts.layoutWidth) && (viewOpts.height || viewOpts.layoutHeight))) {
			autoSized = true;
			if (this.style.fixedAspectRatio) {
				this.style.enforceAspectRatio(iw, ih);
			} else {
				this.style.width = iw;
				this.style.height = ih;
			}
		}

		viewOpts.image = this._img = img;

		if (img) {
			if (this._isSlice) {
				this.updateSlices();

				var sourceSlicesHor = this._sourceSlicesHor;
				var sourceSlicesVer = this._sourceSlicesVer;
				if (sourceSlicesHor) {
					sw = sourceSlicesHor[0] + sourceSlicesHor[1] + sourceSlicesHor[2];
					var sourceScaleX = iw / sw;
					sourceSlicesHor[0] = sourceSlicesHor[0] * sourceScaleX - bounds.marginLeft;
					sourceSlicesHor[1] *= sourceScaleX;
					sourceSlicesHor[2] = sourceSlicesHor[2] * sourceScaleX - bounds.marginRight;
				}
				if (sourceSlicesVer) {
					sh = sourceSlicesVer[0] + sourceSlicesVer[1] + sourceSlicesVer[2];
					var sourceScaleY = ih / sh;
					sourceSlicesVer[0] = sourceSlicesVer[0] * sourceScaleY - bounds.marginTop;
					sourceSlicesVer[1] *= sourceScaleY;
					sourceSlicesVer[2] = sourceSlicesVer[2] * sourceScaleY - bounds.marginBottom;
				}
				[0, 2].forEach(function(num) {
					if (sourceSlicesHor && sourceSlicesHor[num] < 0) {
						sourceSlicesHor[1] += sourceSlicesHor[num];
						sourceSlicesHor[num] = 0;
					}
					if (sourceSlicesVer && sourceSlicesVer[num] < 0) {
						sourceSlicesVer[1] += sourceSlicesVer[num];
						sourceSlicesVer[num] = 0;
					}
				});
			}

			if (viewOpts.autoSize && !autoSized) {
				img.doOnLoad(this, 'autoSize');
			}

			img.doOnLoad(this, 'needsRepaint');
		}
	};

	this.doOnLoad = function () {
		if (arguments.length == 1) {
			this._img.doOnLoad(this, arguments[0]);
		} else {
			this._img.doOnLoad.apply(this._img, arguments);
		}
		return this;
	};

	this.autoSize = function () {
		if (this._img && this._img.isLoaded()) {
			this.style.width = this._img.getWidth() || this._opts.width;
			this.style.height = this._img.getHeight() || this._opts.height;
		}
	};

	this.getOrigWidth = this.getOrigW = function () {
		return this._img.getOrigW();
	};

	this.getOrigHeight = this.getOrigH = function () {
		return this._img.getOrigH();
	};

	function renderCoverOrContain(ctx, opts) {
		if (!this._img) { return; }

		var max = Math.max;
		var min = Math.min;
		var s = this.style;
		var w = s.width;
		var h = s.height;
		var cachedKey = this._renderCacheKey;
		var cache = this._renderCache || (this._renderCache = {x: 0, y: 0, w: 0, h: 0});
		if (cachedKey.width != w || cachedKey.height != h) {
			cachedKey.width = w;
			cachedKey.height = h;

			var bounds = this._img.getBounds();
			var marginLeft = bounds.marginLeft;
			var marginRight = bounds.marginRight;
			var marginTop = bounds.marginTop;
			var marginBottom = bounds.marginBottom;
			var sw = bounds.width;
			var sh = bounds.height;
			var ow = sw + marginLeft + marginRight;
			var oh = sh + marginTop + marginBottom;
			var scale = 1;
			var targetRatio = ow / oh;
			var ratio = w / h;

			var isCover = this._scaleMethod == 'cover';
			if (isCover ? ratio > targetRatio : ratio < targetRatio) {
				scale = w / ow;
			} else {
				scale = h / oh;
			}

			var dw = sw * scale;
			var dh = sh * scale;
			var fw = ow * scale;
			var fh = oh * scale;

			cache.x = this._align == 'left'
				? marginLeft * scale
				: this._align == 'right'
					? w - (sw + marginRight) * scale
					: (w - dw) / 2;
			cache.y = this._verticalAlign == 'top'
				? marginTop * scale
				: this._verticalAlign == 'bottom'
					? h - (sh + marginBottom) * scale
					: (h - dh) / 2;

			cache.w = dw;
			cache.h = dh;
			cache.sx = bounds.x;
			cache.sy = bounds.y;
			cache.sw = sw;
			cache.sh = sh;

			if (isCover) {
				if (fh > h) {
					if (this._verticalAlign == 'bottom') {
						cache.y = max(0, h - marginBottom * scale - dh);
						cache.h = min(dh, h - marginBottom * scale);
						cache.sy += max(0, sh - cache.h / scale);
						cache.sh = cache.h / scale;
					} else if (this._verticalAlign == 'top') {
						cache.y = marginTop * scale;
						cache.h = min(dh, h - cache.y);
						cache.sh = cache.h / scale;
					} else {
						cache.y = max(0, (h - dh) / 2);
						cache.h = min(dh, h);
						cache.sh = cache.h / scale;
						cache.sy = max(cache.sy, cache.sy + (sh - cache.sh) / 2);
					}
				} else if (fw > w) {
					if (this._align == 'right') {
						cache.x = max(0, w - marginRight * scale - dw);
						cache.w = min(dw, w - marginRight * scale);
						cache.sx += max(0, sw - cache.w / scale);
						cache.sw = cache.w / scale;
					} else if (this._align == 'left') {
						cache.x = marginLeft * scale;
						cache.w = min(dw, w - cache.x);
						cache.sw = cache.w / scale;
					} else {
						cache.x = max(0, (w - dw) / 2);
						cache.w = min(dw, w);
						cache.sw = cache.w / scale;
						cache.sx = max(cache.sx, cache.sx + (sw - cache.sw) / 2);
					}
				}
			}
		}

		this._img.render(ctx, cache.sx, cache.sy, cache.sw, cache.sh, cache.x, cache.y, cache.w, cache.h);

		if (this.debug) {
			ctx.strokeStyle = debugColors[0];
			ctx.lineWidth = 1;
			ctx.strokeRect(0, 0, s.width, s.height);
		}
	}

	var renderFunctions = {
		'none': function (ctx, opts) {
			this._img && this._img.render(ctx, 0, 0);
		},
		'stretch': function (ctx, opts) {
			var s = this.style;
			var w = s.width;
			var h = s.height;
			this._img && this._img.render(ctx, 0, 0, w, h);
		},
		'contain': renderCoverOrContain,
		'cover': renderCoverOrContain,
		'tile': function (ctx, opts) {
			if (!this._img) { return; }

			var s = this.style;
			var w = s.width;
			var h = s.height;

			var bounds = this._img.getBounds();
			var iw = bounds.width;
			var ih = bounds.height;

			var x = 0, y = 0;

			if (this.rows) {
				var targetHeight = h / this.rows;
				var targetRatio = targetHeight / ih;
				var targetWidth = iw * targetRatio;
				for (var i = 0; i < this.rows; i++) {
					while (x < w) {
						this._img.render(ctx, x, y, targetWidth, targetHeight);
						if (this.debug) {
							ctx.strokeStyle = debugColors[i % 3];
							ctx.strokeRect(x + 0.5, y + 0.5, targetWidth - 1, targetHeight - 1);
						}
						x += targetWidth;
					}
					y += targetHeight;
					x = 0;
				}
			}
			else if (this.columns) {
				var targetWidth = w / this.columns;
				var targetRatio = targetWidth / iw;
				var targetHeight = ih * targetRatio;
				for (var i = 0; i < this.columns; i++) {
					while (y < h) {
						this._img.render(ctx, x, y, targetWidth, targetHeight);
						if (this.debug) {
							ctx.strokeStyle = debugColors[i % 3];
							ctx.strokeRect(x + 0.5, y + 0.5, targetWidth - 1, targetHeight - 1);
						}
						y += targetHeight;
					}
					x += targetWidth;
					y = 0;
				}
			}
		},
		'slice': function (ctx, opts) {
			if (!this._img) { return; }

			var s = this.style;
			var w = s.width;
			var h = s.height;
			var scale = s.scale;
			var cachedKey = this._renderCacheKey;
			if (cachedKey.width != w || cachedKey.height != h || cachedKey.absScale != scale) {
				cachedKey.width = w;
				cachedKey.height = h;
				cachedKey.absScale = scale;
				this._computeSlices(w, h, scale);
			}

			for (var i = 0; i < 9; i++) {
				this._drawSlice(ctx, this._sliceCache[i], i);
			}
		}
	};

	this._drawSlice = function (ctx, sliceData, i) {
		if (!sliceData.render || (!this._opts.renderCenter && (i == 4))) { return; }
		ctx.drawImage.apply(ctx, sliceData);
		if (this.debug) {
			ctx.strokeStyle = debugColors[i % 3];
			ctx.lineWidth = 1;
			ctx.strokeRect(sliceData[5] + 0.5, sliceData[6] + 0.5,
				sliceData[7] - 1, sliceData[8] - 1);
		}
	};

	var debugColors = ['#FF0000', '#00FF00', '#0000FF'];

	this.getTag = function () {
		var url = this._img && (this._img.getOriginalURL() || this._img._map && this._img._map.url);
		if (url) {
			var match = url.match(/[^\/]+$/);
			if (match) {
				url = match[0];
			}

			url = ':' + url.substring(0, 16);
		}

		return 'ImageScaleView' + this.uid + (url || '');
	};
});
