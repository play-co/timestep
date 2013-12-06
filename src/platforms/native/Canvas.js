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

import .Context2D;
import util.setProperty;

// mock canvas object
var Canvas = GLOBAL.HTMLCanvasElement = exports = Class(function () {
	this.init = function (opts) {
		opts = merge(opts, {
			width: 400,
			height: 400,
			offscreen: true
		});
		
		// TODO: add getters/setters to width/height to auto-resize -- we'll need to allocate
		// a new texture in OpenGL and blit the old one into the new one
		
		this._width = opts.width;
		this._height = opts.height;
		this._offscreen = opts.offscreen;

		this.style = {};
		this._context2D = null;
		this.complete = true;
	}

	this.getContext = function (which, unloadListener) {
		if (which.toUpperCase() == '2D') {
			this.complete = true;
			return this._context2D || (this._context2D = new Context2D({
				canvas: this,
				offscreen: this._offscreen,
				unloadListener: bind(this, function() {
					logger.log("{canvas-registry} Canvas class reacting to canvas loss by setting context to null");

					this._context2D = null;
					if (typeof unloadListener == "function") {
						unloadListener();
					}
				})
			}));
		}
	}

	this.toDataURL = function() {
		return NATIVE.gl.toDataURL(this._context2D)
	}

	this.destroy = function () {
		if (this._context2D) {
			this._context2D.destroy();
		}
	}

	this.resize = function (width, height) {
		if (this._context2D) {
			// this will set our own _width/_height
			this._context2D.resize(width, height);
		}
	}
	
	util.setProperty(this, 'width', {
		set: function (width) {
			this.resize(width, this._height);
		},
		get: function () {
			return this._width;
		}
	});

	util.setProperty(this, 'height', {
		set: function (height) {
			this.resize(this._width, height);
		},
		get: function () {
			return this._height;
		}
	});

	util.setProperty(this, 'src', {
		set: function (src) {},
		get: function () {
			return this._src;
		}
	});


});

document.__registerCreateElementHandler('CANVAS', function () {
	return new Canvas();
});

