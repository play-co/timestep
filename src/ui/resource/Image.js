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
 * @class ui.resource.Image;
 * Model an Image for rendering. Supports taking a subset of images, to support
 * extracting from compacted sprite sheets. Also supports applying filters to
 * an image, usually by the View class.
 *
 * @doc http://doc.gameclosure.com/api/ui-imageview.html#class-ui.resource.image
 * @docsrc https://github.com/gameclosure/doc/blob/master/api/ui/imageview.md
 */

import event.Callback as Callback;
import math.geom.Rect as Rect;
import lib.PubSub;
import device;
import ui.resource.loader as resourceLoader;

/**
 * Callback when images are loaded. This has a failsafe that runs up to a certain
 * threshold asynchronously, attempting to read the image size, before dying.
 */

var ImageCache = {};

// `imageOnLoad` is called when a DOM image object fires a `load` or `error`
// event.  Fire the internal `cb` with the error status.
function imageOnLoad(success, evt, failCount) {
	if (success && !this.width) {
		// Some browsers fire the load event before the image width is
		// available.  Wait up to 3 frames for the width.  Note that an image
		// with zero-width will be considered an error.
		if (failCount <= 3) {
			setTimeout(bind(this, imageOnLoad, success, evt, (failCount || 0) + 1), 0);
		} else {
			this.__cb.fire(false);
		}
	} else {
		this.__cb.fire(!success);
	}
}

/**
 * This class models the region of a larger image that this "Image" references.
 */

var ImageMap = !GLOBAL.CONFIG.disableNativeViews && GLOBAL.NATIVE && GLOBAL.NATIVE.timestep && GLOBAL.NATIVE.timestep.ImageMap;

if (!ImageMap) {
	ImageMap = Class(function () {
		this.init = function (parentImage, x, y, width, height, marginTop, marginRight, marginBottom, marginLeft, url) {
			this.url = url;
			this.x = x;
			this.y = y;
			this.width = width;
			this.height = height;
			this.marginTop = marginTop;
			this.marginRight = marginRight;
			this.marginBottom = marginBottom;
			this.marginLeft = marginLeft;
		}
	});
}

exports = Class(lib.PubSub, function () {
	this.init = function (opts) {
		if (!opts) { opts = {}; }

		this._cb = new Callback();
		this._map = new ImageMap(this, 0, 0, -1, -1, 0, 0, 0, 0, opts.url || '');

		this._originalURL = opts.url;

		resourceLoader._updateImageMap(this._map, opts.url, opts.sourceX, opts.sourceY, opts.sourceW, opts.sourceH);

		this._scale = opts.scale;

		// srcImage can be null, then setSrcImg will create one
		// (use the map's URL in case it was updated to a spritesheet)
		this._setSrcImg(opts.srcImage, this._map.url, opts.forceReload);
	};

	this._setSrcImg = function (img, url, forceReload) {
		this._cb.reset();

		// if we haven't found an image, look in the image cache
		if (!img && url && !forceReload && ImageCache[url]) {
			img = ImageCache[url];
		}

		// look up the base64 cache -- if it's been preloaded, we'll get back an image that's already loaded
		// if it has not been preloaded, we'll get back raw base64 in the b64 variable
		if (!img && !forceReload && Image.get) {
			var b64 = Image.get(url);
			if (typeof b64 == 'object') {
				img = b64;
			} else if (b64) {
				url = b64;
			}
		}

		if (forceReload) {
			// clear native texture in an image object
			if (img && img.destroy) {
				img.destroy();
			}

			// clear native textures by URL
			if (url && NATIVE && NATIVE.gl && NATIVE.gl.deleteTexture) {
				NATIVE.gl.deleteTexture(url);
			}
		}

		// create an image if we don't have one
		if (!img) {
			img = new Image();
		}

		this._srcImg = img;

		if (img instanceof HTMLCanvasElement) {
			this._onLoad(false); // no error
		} else {
			// if it's already loaded, we call _onLoad immediately. Note that
			// we don't use `.complete` here intentionally since web browsers
			// set `.complete = true` before firing on the load/error
			// callbacks, so we can't actually detect whether there's an error
			// in some cases.

			if (!img.__cb) {
				img.__cb = new Callback();
				img.addEventListener('load', bind(img, imageOnLoad, true), false);
				img.addEventListener('error', bind(img, imageOnLoad, false), false);

				if (url) { ImageCache[url] = img; }
				if (!img.src && url) {
					img.src = this._map.url = url;
				}
			}

			img.__cb.run(this, '_onLoad');
		}
	};

	this.setSource = this.setSrcImg = function (srcImg) {
		this._setSrcImg(srcImg);
	};

	this.reload = function (cb) {
		if (this._srcImg) {

			// if passed a lib.Callback, chain it
			if (cb && cb.chain) {
				cb = cb.chain();
			}

			// GC native has a reload method to force reload
			if (this._srcImg.reload) {
				var onReload = bind(this, function () {
					this._srcImg.removeEventListener('reload', onReload, false);
					cb && cb();
				});

				this._srcImg.addEventListener('reload', onReload, false);
				this._srcImg.reload();
			} else if (cb) {
				if (this._cb.fired()) {
					// always wait a frame before calling the callback
					setTimeout(cb, 0);
				} else {
					this._cb.run(cb);
				}
			}
		}
	};

	this.setURL = function (url, forceReload) {
		resourceLoader._updateImageMap(this._map, url);
		this._setSrcImg(null, this._map.url, forceReload);
	};

	this.getURL = function () { return this._map.url; };
	this.getOriginalURL = function () { return this._originalURL; }

	this.getSourceWidth = this.getOrigWidth = this.getOrigW = function () { return this._srcImg.width; };
	this.getSourceHeight = this.getOrigHeight = this.getOrigH = function () { return this._srcImg.height; };

	this.setSourceWidth = this.setSourceW = function (w) { this._map.width = w; };
	this.setSourceHeight = this.setSourceH = function (h) { this._map.height = h; };
	this.setSourceY = this.setSourceY = function (y) { this._map.y = y; };
	this.setSourceX = this.setSourceX = function (x) { this._map.x = x; };

	this.setMarginTop = function (n) { this._map.marginTop = n; };
	this.setMarginRight = function (n) { this._map.marginRight = n; };
	this.setMarginBottom = function (n) { this._map.marginBottom = n; };
	this.setMarginLeft = function (n) { this._map.marginLeft = n; };

	this.getURL = function () { return this._map.url; }

	/* @deprecated */
	this.getSourceWidth = this.getOrigWidth = this.getOrigW = function () { return this._srcImg.width; }
	/* @deprecated */
	this.getSourceHeight = this.getOrigHeight = this.getOrigH = function () { return this._srcImg.height; }
	/* @deprecated */
	this.setSourceWidth = this.setSourceW = function (w) { this._map.width = w; }
	/* @deprecated */
	this.setSourceHeight = this.setSourceH = function (h) { this._map.height = h; }
	/* @deprecated */
	this.setSourceY = this.setSourceY = function (y) { this._map.y = y; }
	/* @deprecated */
	this.setSourceX = this.setSourceX = function (x) { this._map.x = x; }
	/* @deprecated */
	this.setMarginTop = function (n) { this._map.marginTop = n; }
	/* @deprecated */
	this.setMarginRight = function (n) { this._map.marginRight = n; }
	/* @deprecated */
	this.setMarginBottom = function (n) { this._map.marginBottom = n; }
	/* @deprecated */
	this.setMarginLeft = function (n) { this._map.marginLeft = n; }
	
	this.getSource = function () {
		return this._srcImg;
	};

	this.getWidth = function () {
		return (this._map.width == -1
			? 0
			: this._map.width + this._map.marginLeft + this._map.marginRight) / this._map.scale;
	};

	this.getHeight = function () {
		return (this._map.height == -1 ? 0 :
							   this._map.height + this._map.marginTop + this._map.marginBottom) / this._map.scale;
	};

	this.getMap =
	this.getBounds = function () { return this._map; };
	this.setBounds = function (x, y, w, h, marginTop, marginRight, marginBottom, marginLeft) {
		var map = this._map;
		map.x = x;
		map.y = y;
		map.width = w;
		map.height = h;
		map.marginTop = marginTop || 0;
		map.marginRight = marginRight || 0;
		map.marginBottom = marginBottom || 0;
		map.marginLeft = marginLeft || 0;

		this.emit('changeBounds');
	};

	/* @deprecated */
	this.setBounds = this.setMap;
	
	// register a callback for onload
	this.doOnLoad = function () { this._cb.forward(arguments); return this; };

	// internal onload handler for actual Image object
	this._onLoad = function (err) {
		if (err) {
			// TODO: something better?
			logger.error('Image failed to load:', this._map.url);
			this._isError = true;
			this._cb.fire({NoImage: true});
			return;
		}

		if (this._srcImg.width == 0) { logger.warn('Image has no width', this._url); }

		var map = this._map;
		if (this._scale && (map.width != -1 || map.height != -1)) {
			// requested scale & provided a width or height
			if (map.width == -1) {
				// by the above check, this._sourceH should not be -1
				map.width = this._srcImg.width * map.height / this._srcImg.height;
			}

			if (map.height == -1) {
				// this._sourceW was initialized above
				map.height = this._srcImg.height * map.width / this._srcImg.width;
			}

			// TODO: sourceImage might be shared so we can't actually modify width/height.  This is a bug.
			this._srcImg.width = map.width;
			this._srcImg.height = map.height;
		} else {
			if (map.width == -1) { map.width = this._srcImg.width; }
			if (map.height == -1) { map.height = this._srcImg.height; }
		}

		this._map.url = this._srcImg.src;

		this._cb.fire(null, this);
	};

	this.isError = function () { return this._isError; }
	this.isLoaded =
	this.isReady = function () { return !this._isError && this._cb.fired(); };

	var isNative = GLOBAL.NATIVE && !device.simulatingMobileNative;
	var SLICE = Array.prototype.slice;
	if (!isNative) {
		var Canvas = device.get('Canvas');
		var _filterCanvas = new Canvas();
		var _filterCtx = _filterCanvas.getContext('2d');
	};

	this.render = function (ctx, destX, destY, destW, destH) {
		if (!this._cb.fired()) { return; }

		try {
			var args = arguments;
			var map = this._map;
			var scaleX;
			var scaleY;

			if (!(ctx.filters && (ctx.filters.Multiply || ctx.filters.NegativeMask || ctx.filters.PositiveMask))) {
				if (args.length == 9) {
					ctx.drawImage(this._srcImg, args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8]);
				} else if (destX instanceof Rect) {
					if (destY instanceof Rect) {
						var srcRect = destX;
						var destRect = destY;
						scaleX = destRect.width / (map.marginLeft + map.width + map.marginRight);
						scaleY = destRect.height / (map.marginTop + map.height + map.marginBottom);
						ctx.drawImage(this._srcImg,
							srcRect.x, srcRect.y, srcRect.width, srcRect.height,
							destRect.x, destRect.y, destRect.width, destRect.height);

					} else {
						var destRect = destX;
						scaleX = destRect.width / (map.marginLeft + map.width + map.marginRight);
						scaleY = destRect.height / (map.marginTop + map.height + map.marginBottom);
						ctx.drawImage(this._srcImg,
									  map.x, map.y, map.width, map.height,
									  destRect.x + scaleX * map.marginLeft,
									  destRect.y + scaleY * map.marginTop,
									  scaleX * map.width,
									  scaleY * map.height);
					}
				} else {
					scaleX = destW / (map.marginLeft + map.width + map.marginRight);
					scaleY = destH / (map.marginTop + map.height + map.marginBottom);

					if (scaleX != Infinity && scaleY != Infinity) {
						ctx.drawImage(this._srcImg,
									  map.x, map.y, map.width, map.height,
									  (destX || 0) + scaleX * map.marginLeft,
									  (destY || 0) + scaleY * map.marginTop,
									  scaleX * map.width,
									  scaleY * map.height);
					}
				}
			}

			var renderArgs = arguments, img = this;

			function applyOperation(color, op1, op2) {
				_filterCanvas.width = destW;
				_filterCanvas.height = destH;
				_filterCtx.globalCompositeOperation = 'source-over';
				img.render.apply(img, [_filterCtx].concat(SLICE.call(renderArgs, 1)));

				_filterCtx.globalCompositeOperation = op1;
				_filterCtx.fillStyle = "rgba(" + color.r  + "," + color.g + "," + color.b + "," + color.a + ")";
				_filterCtx.fillRect(destX || 0, destY || 0, destW || map.width, destH || map.height);

				var oldCompositeOperation = ctx.globalCompositeOperation;
				ctx.globalCompositeOperation = op2;
				ctx.drawImage(_filterCanvas, destX || 0, destY || 0, destW || map.width, destH || map.height);
				ctx.globalCompositeOperation = oldCompositeOperation;
			}

			// Rendering engine flags.
			var isWebkit = /WebKit/.exec(navigator.appVersion);
			if (!isNative && ctx.filters) {

				if (ctx.filters.LinearAdd) {
					var f = ctx.filters.LinearAdd.get();
					applyOperation(f, 'source-in', 'lighter');
				}

				if (ctx.filters.Tint) {
					var f = ctx.filters.Tint.get();
					var color = {r: f.r, g: f.g, b: f.b, a: f.a};
					applyOperation(color, 'source-in', 'source-over');
				}

				if (ctx.filters.Multiply) {
					var f = ctx.filters.Multiply.get();
					var imgData = this.getImageData();
					var data = imgData.data;
					
					for (var i = 0; i < data.length; i+=4) {
						data[i] *= (f.r / 255);
						data[i + 1] *= (f.g / 255); 
						data[i + 2] *= (f.b / 255); 
					}

					_filterCanvas.width = imgData.width;
					_filterCanvas.height = imgData.height;
					_filterCtx.putImageData(imgData, 0, 0);
					ctx.drawImage(_filterCanvas, destX || 0, destY || 0, destW || map.width, destH || map.height);

				}

				if (ctx.filters.NegativeMask) {
					var f = ctx.filters.NegativeMask.get();
					_filterCanvas.width = destW;
					_filterCanvas.height = destH;
					_filterCtx.globalCompositeOperation = 'source-over';
					f.imgObject.render.apply(f.imgObject, [_filterCtx].concat(SLICE.call(renderArgs, 1)));

					_filterCtx.globalCompositeOperation = 'source-in';
					img.render.apply(img, [_filterCtx].concat(SLICE.call(renderArgs, 1)));

					var oldCompositeOperation = ctx.globalCompositeOperation;
					ctx.globalCompositeOperation = 'source-over';
					ctx.drawImage(_filterCanvas, destX || 0, destY || 0, destW || map.width, destH || map.height);
					ctx.globalCompositeOperation = oldCompositeOperation;
				}

				if (ctx.filters.PositiveMask) {
					var f = ctx.filters.PositiveMask.get();
					_filterCanvas.width = destW;
					_filterCanvas.height = destH;
					_filterCtx.globalCompositeOperation = 'source-over';
					f.imgObject.render.apply(f.imgObject, [_filterCtx].concat(SLICE.call(renderArgs, 1)));

					_filterCtx.globalCompositeOperation = 'source-out';
					img.render.apply(img, [_filterCtx].concat(SLICE.call(renderArgs, 1)));

					var oldCompositeOperation = ctx.globalCompositeOperation;
					ctx.globalCompositeOperation = 'source-over';
					ctx.drawImage(_filterCanvas, destX || 0, destY || 0, destW || map.width, destH || map.height);
					ctx.globalCompositeOperation = oldCompositeOperation;
				}
			}
		} catch(e) {}
	};

	this.getImageData = function () {
		if (!GLOBAL.document || !document.createElement) { throw 'Not supported'; }
		if (!this._map.width || !this._map.height) { throw 'Not loaded'; }

		var canvas = document.createElement('canvas');
		canvas.width = this._map.width;
		canvas.height = this._map.height;
		var ctx = canvas.getContext('2d');

		this.render(ctx, 0, 0, this._map.width, this._map.height);

		var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

		return imageData;
	};

	this.setImageData = function (data) { };

	this.destroy = function () {
		this._srcImg.destroy && this._srcImg.destroy();
	};
});

exports.__clearCache__ = function () {
	ImageCache = {};
};
