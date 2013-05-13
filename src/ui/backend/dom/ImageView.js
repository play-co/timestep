/**
 * @license
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

/**
 * @package ui.backend.dom.ImageView;
 *
 * Renders an image in a View for canvas.
 */

import ui.View as View;
import ui.resource.Image as Image;

function getImageURL(image) {
	if (image.getSource) {
		return image.getSource().src;
	} else {
		return image;
	}
}

/**
 * @extends timestep.View
 */
exports = Class(View, function (supr) {

	this.init = function (opts) {
		opts = merge(opts, {
			image: null,
			autoSize: false
		});

		supr(this, "init", [opts]);

		if (opts.image) {
			this.setImage(opts.image, opts); 
		}
	};

	this.autoSize = function() {
		if (this._img) {
			this.style.width = this._img.getWidth();
			this.style.height = this._img.getHeight();

			if (this.style.fixedAspectRatio) {
				this.style.updateAspectRatio();
			}
		}
	}

	this.tick = function() {
		if (this._img) {
			var boundsHash = JSON.stringify(this._img.getBounds());
			if (this._cachedBounds != boundsHash) {
				this._cachedBounds = boundsHash;
				this.updateImage();
			}
		}
	}

	this._imgCache = {};

	this.getImage = function() { return this._img; }
	this.setImage = function(img, opts) {
		if (typeof img == 'string') {
			// Cache image requests to avoid heavy performance penalties at the
			// expense of a small amount of additional JS memory usage.
			var name = img;
			img = this._imgCache[name];
			if (!img) {
				this._imgCache[img] = img = new Image({url: name});
			}
		}

		this._img = img;

		if (this._img) {
			if (opts && opts.autoSize) {
				// sprited resources will know their dimensions immediately
				if (this._img.getWidth() > 0 && this._img.getHeight() > 0) {
					this.autoSize();
				} else {
					// non-sprited resources need to load first
					this._img.doOnLoad(this, 'autoSize');
				}
			}

			this._img.doOnLoad(this, 'updateImage');
		} else {
			this.updateImage();
		}
	}

	this.reflow = function () {
		this.updateImage();
	}

	this.updateImage = function() {
		var s = this.__view._node.style;
		if (!this._img || !this._img.isReady()) {
			s.backgroundImage = 'none';
			return;
		}

		var img = this._img;
		var bounds = img.getBounds();

		var sheetWidth = img.getOrigW();
		var sheetHeight = img.getOrigH();
		var imgWidth = bounds.width + bounds.marginLeft + bounds.marginRight;
		var imgHeight = bounds.height + bounds.marginTop + bounds.marginBottom;

		s.padding = bounds.marginTop + 'px ' + bounds.marginRight + 'px ' + bounds.marginBottom + 'px ' + bounds.marginLeft + 'px';

		var scaleX = this.style.width / imgWidth;
		var scaleY = this.style.height / imgHeight;

		//s.overflow = 'hidden';
		s.webkitBackgroundClip = s.backgroundClip = 'content-box';
		s.backgroundImage = 'url("' + getImageURL(img) + '")';
		s.backgroundPositionX = scaleX * (-bounds.x + bounds.marginLeft) + 'px';
		s.backgroundPositionY = scaleY * (-bounds.y + bounds.marginTop) + 'px';
		s.backgroundSize = sheetWidth * scaleX + 'px ' + sheetHeight * scaleY + 'px';
	}

	this.getOrigWidth = this.getOrigW = function() { return this._img.getOrigW(); }
	this.getOrigHeight = this.getOrigH = function() { return this._img.getOrigH(); }

	this.doOnLoad = function() {
		if (arguments.length == 1) {
			this._img.doOnLoad(this, arguments[0]);
		} else {
			this._img.doOnLoad.apply(this._img, arguments);
		}
		return this;
	}

});
