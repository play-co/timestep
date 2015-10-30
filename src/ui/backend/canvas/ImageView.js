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
 * package ui.backend.canvas.ImageView;
 *
 * canvas.ImageView implementation.
 */

import util.path;
import std.uri as URI;

import ui.View as View;
import ui.resource.Image as Image;
import ui.resource.ImageViewCache as ImageViewCache;

/**
 * @extends ui.View
 */
var ImageView = exports = Class(View, function (supr) {

	/**
	 * Options:
	 *   autoSize - See .setImage()
	 */

	/**
	 * Return this view's Image object.
	 */

	this.getImage = function () {
		return this._img;
	};

	// @deprecated
	this.getImageFromCache = function(url, forceReload) {
		return ImageViewCache.getImage(url, forceReload);
	};

	this.updateOpts = function (opts) {
		var opts = supr(this, 'updateOpts', arguments);

		if ('autoSize' in opts) {
			this._autoSize = !!opts.autoSize;
		}

		if (opts.image) {
			this.setImage(opts.image);
		} else {
			this.needsReflow();
		}

		return opts;
	};

	/**
	 * Set the image of the view from an Image object or string.
	 * Options:
	 *   autoSize - Automatically set view size from image dimensions.
	 */

	this.setImage = function (img, opts) {
		var forceReload = opts && opts.forceReload;
		if (typeof img == 'string') {
			img = ImageViewCache.getImage(img, forceReload);
		} else if (forceReload) {
			img.reload();
		}

		this._img = img;

		if (this._img) {
			this._autoSize = (opts && ('autoSize' in opts)) ? opts.autoSize : this._autoSize;
			if (this._autoSize) {
				// sprited resources will know their dimensions immediately
				if (this._img.getWidth() > 0 && this._img.getHeight() > 0) {
					this.autoSize();
				} else {
					// non-sprited resources need to load first
					this._img.doOnLoad(this, 'autoSize');
				}
			}
			this._img.doOnLoad(this, 'needsRepaint');
		}
	};

	/**
	 * Pass a function to load once the Image object is loaded, or a list of
	 * arguments that call lib.Callback::run() implicitly.
	 */

	this.doOnLoad = function () {
		if (arguments.length == 1) {
			this._img.doOnLoad(this, arguments[0]);
		} else {
			this._img.doOnLoad.apply(this._img, arguments);
		}
		return this;
	};

	/**
	 * Automatically resize the view to the size of the image.
	 */

	this.autoSize = function () {
		if (this._img) {
			this.style.width = this._img.getWidth();
			this.style.height = this._img.getHeight();

			if (this.style.fixedAspectRatio) {
				this.style.enforceAspectRatio(this.style.width, this.style.height);
			}
		}
	}

	/**
	 * Get original width of the Image object.
	 */

	this.getOrigWidth = this.getOrigW = function () {
		return this._img.getOrigW();
	};

	/**
	 * Get original height of the Image object.
	 */

	this.getOrigHeight = this.getOrigH = function () {
		return this._img.getOrigH();
	};

	/**
	 * Render this image onto a canvas.
	 */

	this.render = function (ctx) {
		if (!this._img) { return; }

		var s = this.style;
		var w = s.width;
		var h = s.height;
		this._img.render(ctx, 0, 0, w, h);
	}

	/**
	 * Return a human-readable tag for this view.
	 */

	var _loc = window.location.toString();
	var _host = window.location.hostname;

	this.getTag = function () {
		var tag;
		if (this._img) {
			var url = this._img.getOriginalURL();
			if (this._cachedTag && url == this._cachedTag.url) {
				tag = this._cachedTag.tag;
			} else {
				var uri = URI.relativeTo(url, _loc);
				var host = uri.getHost();
				tag = util.path.splitExt(uri.getFile()).basename + (host && host != _host ? ':' + host : '');

				this._cachedTag = {
					url: url,
					tag: tag
				};
			}
		};

		return (tag || '') + ':ImageView' + this.uid;
	}
});
