/* @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with the Game Closure SDK.  If not, see <http://www.gnu.org/licenses/>.
 */

jsio('import .Context2D');

// mock canvas object for IOS

logger.log('setting up the canvas object');
var Canvas = GLOBAL.HTMLCanvasElement = exports = Class(function() {
	this.init = function(opts) {
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
	
	this.__defineSetter__('width', function(width) {
		this._width = width;
		if (this._context2D) { this._resize(); }
	});
	
	this.__defineGetter__('width', function() { return this._width; });
	
	this.__defineSetter__('height', function(height) {
		this._height = height;
		if (this._context2D) { this._resize(); }
	});
	
	this.__defineGetter__('height', function() { return this._height; });
	
	this._resize = function() { throw 'resizing a rendered canvas is not yet implemented!'; }
	
	this.getContext = function(which) {
		if (which.toUpperCase() == '2D') {
			this.complete = true;
			return this._context2D || (this._context2D = new Context2D({
				canvas: this,
				offscreen: this._offscreen
			}));
		}
	}

	this.toFileURI = function (filename) {
		return NATIVE.gl.saveBufferToFile(this._context2D, filename)
	}
});

logger.log('set it up')
logger.log(GLOBAL.HTMLCanvasElement)
document.__registerCreateElementHandler('CANVAS', function() {
	return new Canvas();
});

